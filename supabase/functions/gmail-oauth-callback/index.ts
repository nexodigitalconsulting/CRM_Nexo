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
  const errorDescription = url.searchParams.get("error_description");

  console.log(`[gmail-oauth-callback] ==================== CALLBACK RECEIVED ====================`);
  console.log(`[gmail-oauth-callback] Request URL: ${req.url}`);
  console.log(`[gmail-oauth-callback] Code present: ${!!code}`);
  console.log(`[gmail-oauth-callback] Error: ${error || 'none'}`);
  console.log(`[gmail-oauth-callback] Error description: ${errorDescription || 'none'}`);
  console.log(`[gmail-oauth-callback] SUPABASE_URL: ${SUPABASE_URL}`);
  console.log(`[gmail-oauth-callback] CLIENT_ID configured: ${!!GOOGLE_CLIENT_ID}`);
  console.log(`[gmail-oauth-callback] =============================================================`);

  // Get the app URL for redirecting back (use origin from request or env)
  const appUrl = Deno.env.get("APP_URL") || "https://nexodigitalconsulting.lovable.app";
  
  // HTML template for response with auto-redirect
  const htmlResponse = (title: string, message: string, isSuccess: boolean, redirectUrl?: string, details?: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta http-equiv="refresh" content="3;url=${redirectUrl || `${appUrl}/settings`}" />
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
          max-width: 500px;
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
        .details {
          background: #f3f4f6;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #4b5563;
          text-align: left;
          margin-top: 16px;
          white-space: pre-wrap;
          word-break: break-all;
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
        ${details ? `<div class="details">${details}</div>` : ''}
        <p class="redirect-text">Redirigiendo automáticamente... <a href="${redirectUrl || `${appUrl}/settings`}">Click aquí si no redirige</a></p>
      </div>
    </body>
    </html>
  `;

  // Helper function to generate specific error messages
  const getErrorDetails = (errorCode: string, errorDesc: string | null): { message: string, details: string } => {
    const callbackUrl = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
    
    switch (errorCode) {
      case 'access_denied':
        return {
          message: 'Acceso denegado por Google. Posibles causas:',
          details: `1. La app está en modo "Testing" y tu email NO está en "Test users"
2. El usuario canceló la autorización
3. El scope gmail.send es sensible y requiere verificación

Solución:
- Ve a Google Cloud Console → OAuth consent screen
- Añade tu email a "Test users"
- O publica la app (requiere verificación de Google)

Callback URL esperada: ${callbackUrl}`
        };
      
      case 'redirect_uri_mismatch':
        return {
          message: 'La URI de redirección no coincide con la configurada en Google Cloud Console.',
          details: `La URI EXACTA que debes configurar es:
${callbackUrl}

Pasos:
1. Ve a Google Cloud Console → Credentials
2. Edita tu cliente OAuth 2.0
3. En "URIs de redirección autorizados" añade EXACTAMENTE:
   ${callbackUrl}
4. Guarda los cambios y espera 5 minutos`
        };
      
      case 'invalid_client':
        return {
          message: 'El Client ID o Client Secret es inválido.',
          details: `Verifica que:
1. GOOGLE_CLIENT_ID en Supabase secrets coincide con el de Google Cloud Console
2. GOOGLE_CLIENT_SECRET en Supabase secrets coincide con el de Google Cloud Console
3. El cliente OAuth no ha sido eliminado

Client ID configurado empieza con: ${GOOGLE_CLIENT_ID?.substring(0, 20)}...`
        };
      
      case 'invalid_grant':
        return {
          message: 'El código de autorización expiró o ya fue usado.',
          details: `El código que Google proporcionó ya no es válido.
Intenta conectar Gmail de nuevo.`
        };
      
      default:
        return {
          message: `Error de Google: ${errorCode}`,
          details: errorDesc || 'Sin descripción adicional'
        };
    }
  };

  if (error) {
    console.error(`[gmail-oauth-callback] OAuth error: ${error}`);
    console.error(`[gmail-oauth-callback] Error description: ${errorDescription}`);
    
    const errorInfo = getErrorDetails(error, errorDescription);
    
    return new Response(
      htmlResponse(
        "Error de autenticación",
        errorInfo.message,
        false,
        `${appUrl}/settings`,
        errorInfo.details
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    console.error(`[gmail-oauth-callback] No code received`);
    return new Response(
      htmlResponse(
        "Error",
        "No se recibió el código de autorización de Google.",
        false,
        `${appUrl}/settings`,
        "Esto puede ocurrir si:\n- El usuario canceló la autorización\n- Hubo un error de red\n- La URL de callback no es correcta"
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error(`[gmail-oauth-callback] Missing credentials`);
      console.error(`[gmail-oauth-callback] CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
      console.error(`[gmail-oauth-callback] CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
      throw new Error("Google OAuth credentials not configured in Supabase Edge Function secrets");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const callbackUrl = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

    // Exchange code for tokens
    console.log(`[gmail-oauth-callback] Exchanging code for tokens...`);
    console.log(`[gmail-oauth-callback] Using callback URL: ${callbackUrl}`);
    
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
      console.error("[gmail-oauth-callback] Token exchange error:", JSON.stringify(tokenData));
      const errorInfo = getErrorDetails(tokenData.error, tokenData.error_description);
      throw new Error(`${errorInfo.message}\n\n${errorInfo.details}`);
    }

    console.log(`[gmail-oauth-callback] Token exchange successful`);

    // Get user email
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const userInfo = await userInfoResponse.json();

    console.log(`[gmail-oauth-callback] Connected email: ${userInfo.email}`);

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

    console.log(`[gmail-oauth-callback] Gmail connected successfully!`);

    return new Response(
      htmlResponse(
        "¡Gmail conectado!",
        `Tu cuenta ${userInfo.email} ha sido vinculada correctamente.`,
        true,
        `${appUrl}/settings`
      ),
      { headers: { "Content-Type": "text/html" } }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido al conectar Gmail";
    console.error("[gmail-oauth-callback] Error:", errorMessage);
    return new Response(
      htmlResponse(
        "Error al conectar Gmail",
        "No se pudo completar la conexión con Gmail.",
        false,
        `${appUrl}/settings`,
        errorMessage
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
});
