import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log(`[gmail-oauth-callback] Received callback`);

  // Get the app URL for redirecting back (use origin from request or env)
  const appUrl = Deno.env.get("APP_URL") || "https://nexodigitalconsulting.lovable.app";
  
  // HTML template for response with auto-redirect
  const htmlResponse = (title: string, message: string, isSuccess: boolean, redirectUrl?: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta http-equiv="refresh" content="2;url=${redirectUrl || `${appUrl}/settings`}" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: ${isSuccess ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
        }
        .card {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h1 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }
        p {
          color: #6b7280;
          margin: 0 0 16px 0;
        }
        .redirect-text {
          font-size: 14px;
          color: #9ca3af;
        }
        a {
          color: ${isSuccess ? '#059669' : '#dc2626'};
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${isSuccess ? '✅' : '❌'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <p class="redirect-text">Redirigiendo automáticamente... <a href="${redirectUrl || `${appUrl}/settings`}">Click aquí si no redirige</a></p>
      </div>
    </body>
    </html>
  `;

  if (error) {
    console.error(`[gmail-oauth-callback] OAuth error: ${error}`);
    return new Response(
      htmlResponse("Error de autenticación", `No se pudo conectar con Gmail: ${error}`, false, `${appUrl}/settings`),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new Response(
      htmlResponse("Error", "No se recibió el código de autorización", false, `${appUrl}/settings`),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const callbackUrl = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

    // Exchange code for tokens
    console.log(`[gmail-oauth-callback] Exchanging code for tokens`);
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
      console.error("[gmail-oauth-callback] Token error:", tokenData);
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

    console.log(`[gmail-oauth-callback] Connected: ${userInfo.email}`);

    const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Delete existing config
    await supabase
      .from("gmail_config")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert new config
    const { error: insertError } = await supabase.from("gmail_config").insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: tokenExpiry,
      email_address: userInfo.email,
      is_active: true,
    });

    if (insertError) {
      console.error("[gmail-oauth-callback] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[gmail-oauth-callback] Gmail connected successfully`);

    return new Response(
      htmlResponse(
        "¡Gmail conectado!",
        `Tu cuenta ${userInfo.email} ha sido vinculada correctamente. Redirigiendo...`,
        true,
        `${appUrl}/settings`
      ),
      { headers: { "Content-Type": "text/html" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error al conectar Gmail";
    console.error("[gmail-oauth-callback] Error:", errorMessage);
    return new Response(
      htmlResponse("Error", errorMessage, false, `${appUrl}/settings`),
      { headers: { "Content-Type": "text/html" } }
    );
  }
});
