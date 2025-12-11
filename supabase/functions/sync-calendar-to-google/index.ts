import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  eventType: "contract" | "invoice" | "billing";
  eventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error("Missing Google OAuth credentials");
    return null;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Failed to refresh token:', await response.text());
    return null;
  }

  return response.json();
}

async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
  }
): Promise<{ id: string } | null> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    console.error('Failed to create Google Calendar event:', await response.text());
    return null;
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Invalid token');
    }

    const body: SyncRequest = await req.json();
    console.log("Sync request:", body);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Google Calendar config
    const { data: config, error: configError } = await supabase
      .from('google_calendar_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, message: "Google Calendar no conectado" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = config.access_token;

    // Check if token is expired
    if (config.token_expiry && new Date(config.token_expiry) < new Date()) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshAccessToken(config.refresh_token);
      
      if (!newTokens) {
        return new Response(
          JSON.stringify({ success: false, message: "Error al refrescar token de Google" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = newTokens.access_token;

      // Update stored tokens
      await supabase
        .from('google_calendar_config')
        .update({
          access_token: newTokens.access_token,
          token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Create the event in Google Calendar
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const googleEvent = body.allDay
      ? {
          summary: body.title,
          description: body.description,
          start: { date: startDate.toISOString().split('T')[0] },
          end: { date: endDate.toISOString().split('T')[0] },
        }
      : {
          summary: body.title,
          description: body.description,
          start: { dateTime: startDate.toISOString(), timeZone: 'Europe/Madrid' },
          end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Madrid' },
        };

    const createdEvent = await createGoogleCalendarEvent(accessToken, googleEvent);

    if (!createdEvent) {
      return new Response(
        JSON.stringify({ success: false, message: "Error al crear evento en Google Calendar" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Created Google Calendar event:", createdEvent.id);

    // Also create the event in our calendar_events table
    await supabase.from('calendar_events').insert({
      user_id: userId,
      title: body.title,
      description: body.description,
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      all_day: body.allDay || false,
      google_event_id: createdEvent.id,
      is_synced_to_google: true,
      status: 'confirmed',
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Evento sincronizado con Google Calendar",
        googleEventId: createdEvent.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error syncing event:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
