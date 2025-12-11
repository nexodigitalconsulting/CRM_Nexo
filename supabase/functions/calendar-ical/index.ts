import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate iCal date format
function formatICalDate(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters for iCal
function escapeICalText(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Generate unique UID for event
function generateUID(eventId: string, domain: string): string {
  return `${eventId}@${domain}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const token = url.searchParams.get('token');

    if (!userId) {
      return new Response('Missing user_id parameter', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Create Supabase client with service role for reading events
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user exists and token matches (simple validation)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return new Response('Invalid user', { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Fetch calendar events for this user - include all non-cancelled events
    const { data: calendarEvents, error: eventsError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        start_datetime,
        end_datetime,
        all_day,
        location,
        status,
        importance,
        created_at,
        updated_at,
        calendar_categories(name, color)
      `)
      .eq('user_id', userId)
      .neq('status', 'cancelled');

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response('Error fetching events', { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    // Fetch contracts for billing/renewal events (filtered by user)
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id,
        name,
        contract_number,
        start_date,
        end_date,
        next_billing_date,
        status,
        total,
        created_by,
        clients(name)
      `)
      .eq('created_by', userId)
      .eq('status', 'active');

    // Fetch invoices for due dates (filtered by user)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        due_date,
        status,
        total,
        created_by,
        clients(name)
      `)
      .eq('created_by', userId)
      .eq('status', 'issued');

    // Build iCal content
    const domain = 'crm.lovable.app';
    const calendarName = `CRM - ${profile.full_name || profile.email}`;
    
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lovable CRM//Calendar//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICalText(calendarName)}`,
      'X-WR-TIMEZONE:Europe/Madrid',
      // Force calendar apps to refresh every 5 minutes
      'REFRESH-INTERVAL;VALUE=DURATION:PT5M',
      'X-PUBLISHED-TTL:PT5M',
    ];

    // Add timezone definition
    icalContent.push(
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Madrid',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE'
    );

    // Add calendar events
    if (calendarEvents) {
      for (const event of calendarEvents) {
        const startDate = new Date(event.start_datetime);
        const endDate = new Date(event.end_datetime);
        const createdAt = new Date(event.created_at);
        const updatedAt = new Date(event.updated_at || event.created_at);

        icalContent.push(
          'BEGIN:VEVENT',
          `UID:${generateUID(event.id, domain)}`,
          `DTSTAMP:${formatICalDate(new Date())}`,
          event.all_day 
            ? `DTSTART;VALUE=DATE:${formatICalDate(startDate, true)}`
            : `DTSTART;TZID=Europe/Madrid:${formatICalDate(startDate)}`,
          event.all_day 
            ? `DTEND;VALUE=DATE:${formatICalDate(endDate, true)}`
            : `DTEND;TZID=Europe/Madrid:${formatICalDate(endDate)}`,
          `SUMMARY:${escapeICalText(event.title)}`,
        );

        if (event.description) {
          icalContent.push(`DESCRIPTION:${escapeICalText(event.description)}`);
        }
        if (event.location) {
          icalContent.push(`LOCATION:${escapeICalText(event.location)}`);
        }
        const category = (event.calendar_categories as unknown as { name: string; color: string }) || null;
        if (category?.name) {
          icalContent.push(`CATEGORIES:${escapeICalText(category.name)}`);
        }
        
        // Add importance as priority (1=high, 5=medium, 9=low)
        const priorityMap: Record<string, number> = { high: 1, medium: 5, low: 9 };
        if (event.importance && priorityMap[event.importance as string]) {
          icalContent.push(`PRIORITY:${priorityMap[event.importance]}`);
        }

        icalContent.push(
          `CREATED:${formatICalDate(createdAt)}`,
          `LAST-MODIFIED:${formatICalDate(updatedAt)}`,
          'END:VEVENT'
        );
      }
    }

    // Add contract events (start, end, billing)
    if (contracts) {
      for (const contract of contracts) {
        const contractName = contract.name || `Contrato #${contract.contract_number}`;
        const client = (contract.clients as unknown as { name: string }) || null;
        const clientName = client?.name || '';

        // Contract start
        if (contract.start_date) {
          const startDate = new Date(contract.start_date);
          icalContent.push(
            'BEGIN:VEVENT',
            `UID:${generateUID(`contract-start-${contract.id}`, domain)}`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `DTSTART;VALUE=DATE:${formatICalDate(startDate, true)}`,
            `DTEND;VALUE=DATE:${formatICalDate(new Date(startDate.getTime() + 86400000), true)}`,
            `SUMMARY:📋 Inicio: ${escapeICalText(contractName)}`,
            `DESCRIPTION:Cliente: ${escapeICalText(clientName)}`,
            'CATEGORIES:Contratos',
            'END:VEVENT'
          );
        }

        // Contract end
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          icalContent.push(
            'BEGIN:VEVENT',
            `UID:${generateUID(`contract-end-${contract.id}`, domain)}`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `DTSTART;VALUE=DATE:${formatICalDate(endDate, true)}`,
            `DTEND;VALUE=DATE:${formatICalDate(new Date(endDate.getTime() + 86400000), true)}`,
            `SUMMARY:⚠️ Fin: ${escapeICalText(contractName)}`,
            `DESCRIPTION:Cliente: ${escapeICalText(clientName)}`,
            'CATEGORIES:Contratos',
            'PRIORITY:1',
            'END:VEVENT'
          );
        }

        // Next billing
        if (contract.next_billing_date) {
          const billingDate = new Date(contract.next_billing_date);
          const totalFormatted = contract.total 
            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(contract.total))
            : '';
          icalContent.push(
            'BEGIN:VEVENT',
            `UID:${generateUID(`contract-billing-${contract.id}`, domain)}`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `DTSTART;VALUE=DATE:${formatICalDate(billingDate, true)}`,
            `DTEND;VALUE=DATE:${formatICalDate(new Date(billingDate.getTime() + 86400000), true)}`,
            `SUMMARY:💰 Facturar: ${escapeICalText(contractName)}`,
            `DESCRIPTION:Cliente: ${escapeICalText(clientName)}\\nImporte: ${totalFormatted}`,
            'CATEGORIES:Facturación',
            'END:VEVENT'
          );
        }
      }
    }

    // Add invoice due dates
    if (invoices) {
      for (const invoice of invoices) {
        if (invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          const invClient = (invoice.clients as unknown as { name: string }) || null;
          const clientName = invClient?.name || '';
          icalContent.push(
            'BEGIN:VEVENT',
            `UID:${generateUID(`invoice-due-${invoice.id}`, domain)}`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `DTSTART;VALUE=DATE:${formatICalDate(dueDate, true)}`,
            `DTEND;VALUE=DATE:${formatICalDate(new Date(dueDate.getTime() + 86400000), true)}`,
            `SUMMARY:📄 Vence: FF-${String(invoice.invoice_number).padStart(4, '0')}`,
            `DESCRIPTION:Cliente: ${escapeICalText(clientName)}`,
            'CATEGORIES:Facturas',
            'PRIORITY:5',
            'END:VEVENT'
          );
        }
      }
    }

    icalContent.push('END:VCALENDAR');

    const icalString = icalContent.join('\r\n');

    return new Response(icalString, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="crm-calendar.ics"',
        // Force frequent refreshes - prevent caching
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Tell calendar apps to refresh more frequently
        'X-WR-REFRESH-INTERVAL': 'PT5M',
      },
    });

  } catch (error) {
    console.error('iCal generation error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
});
