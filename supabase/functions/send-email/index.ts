import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  entityType?: string;
  entityId?: string;
  attachPdf?: boolean;
  pdfHtml?: string;
  pdfFilename?: string;
  test?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email settings
    const { data: settings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching email settings:", settingsError);
      throw new Error("Error al obtener configuración de email");
    }

    if (!settings) {
      throw new Error("No hay configuración de email. Configure SMTP en Configuración > Correo Electrónico");
    }

    if (!settings.is_active) {
      throw new Error("El envío de emails está desactivado");
    }

    const body: EmailRequest = await req.json();
    console.log("Email request:", { 
      to: body.to, 
      cc: body.cc,
      subject: body.subject, 
      test: body.test,
      attachPdf: body.attachPdf,
      pdfFilename: body.pdfFilename
    });

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: settings.smtp_secure,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    // If this is a test, send a test email to the from_email
    if (body.test) {
      try {
        await client.send({
          from: settings.from_email,
          to: settings.from_email,
          subject: "Test de conexión SMTP - CRM",
          content: "auto",
          html: "<p>Este es un email de prueba para verificar la configuración SMTP.</p>",
        });
        await client.close();
        console.log("SMTP connection test successful");
        return new Response(
          JSON.stringify({ success: true, message: "Conexión SMTP exitosa" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (connError: unknown) {
        console.error("SMTP connection test failed:", connError);
        const errorMessage = connError instanceof Error ? connError.message : "Error desconocido";
        throw new Error(`Error de conexión SMTP: ${errorMessage}`);
      }
    }

    // Validate required fields
    if (!body.to || !body.subject || !body.html) {
      throw new Error("Faltan campos requeridos: to, subject, html");
    }

    // Prepare email options
    const emailOptions: any = {
      from: settings.from_name 
        ? `${settings.from_name} <${settings.from_email}>`
        : settings.from_email,
      to: body.to,
      subject: body.subject,
      content: "auto",
      html: body.html,
    };

    // Add CC if provided
    if (body.cc) {
      emailOptions.cc = body.cc;
    }

    // If PDF attachment requested
    if (body.attachPdf && body.pdfHtml && body.pdfFilename) {
      console.log("Attaching document:", body.pdfFilename);
      const pdfBase64 = btoa(unescape(encodeURIComponent(body.pdfHtml)));
      
      emailOptions.attachments = [
        {
          filename: body.pdfFilename.replace('.pdf', '.html'),
          content: pdfBase64,
          encoding: "base64",
          contentType: "text/html",
        }
      ];
    }

    // Send email
    try {
      await client.send(emailOptions);
      await client.close();
      console.log("Email sent successfully to:", body.to);
    } catch (sendError: unknown) {
      console.error("Error sending email:", sendError);
      const errorMessage = sendError instanceof Error ? sendError.message : "Error desconocido";
      throw new Error(`Error al enviar email: ${errorMessage}`);
    }

    // Log the notification if it's entity-related
    if (body.entityType && body.entityId) {
      await supabase.from("notification_queue").insert({
        rule_type: "manual_send",
        entity_type: body.entityType,
        entity_id: body.entityId,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
