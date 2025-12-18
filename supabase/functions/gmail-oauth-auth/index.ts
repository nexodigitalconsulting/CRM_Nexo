import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri } = await req.json();
    console.log(`[gmail-oauth-auth] Action: ${action}`);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Obtener la URL base del proyecto para el callback
    const baseUrl = SUPABASE_URL?.replace('.supabase.co', '.supabase.co');
    const callbackUrl = redirectUri || `${baseUrl}/functions/v1/gmail-oauth-callback`;

    if (action === "get_auth_url") {
      const scopes = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", callbackUrl);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      console.log(`[gmail-oauth-auth] Generated auth URL with callback: ${callbackUrl}`);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "exchange_code") {
      if (!code) {
        throw new Error("Authorization code is required");
      }

      console.log(`[gmail-oauth-auth] Exchanging code for tokens`);

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("[gmail-oauth-auth] Token exchange error:", tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      // Get user email
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      console.log(`[gmail-oauth-auth] Connected email: ${userInfo.email}`);

      // Calculate token expiry
      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Upsert gmail config (delete existing first, then insert)
      const { error: deleteError } = await supabase
        .from("gmail_config")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        console.error("[gmail-oauth-auth] Delete error:", deleteError);
      }

      const { error: insertError } = await supabase.from("gmail_config").insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenExpiry,
        email_address: userInfo.email,
        is_active: true,
      });

      if (insertError) {
        console.error("[gmail-oauth-auth] Insert error:", insertError);
        throw insertError;
      }

      console.log(`[gmail-oauth-auth] Gmail config saved successfully`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          email: userInfo.email 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh_token") {
      // Get current config
      const { data: config, error: configError } = await supabase
        .from("gmail_config")
        .select("*")
        .limit(1)
        .single();

      if (configError || !config?.refresh_token) {
        throw new Error("No Gmail configuration found");
      }

      console.log(`[gmail-oauth-auth] Refreshing token for ${config.email_address}`);

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: config.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("[gmail-oauth-auth] Refresh token error:", tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Update access token
      const { error: updateError } = await supabase
        .from("gmail_config")
        .update({
          access_token: tokenData.access_token,
          token_expiry: tokenExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (updateError) throw updateError;

      console.log(`[gmail-oauth-auth] Token refreshed successfully`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          access_token: tokenData.access_token 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[gmail-oauth-auth] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
