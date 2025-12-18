import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";
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
  pdfBase64?: string;
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

    // Append signature if configured
    let finalHtml = body.html;
    if (settings.signature_html) {
      finalHtml = body.html + settings.signature_html;
    }

    // Prepare email options
    const emailOptions: any = {
      from: settings.from_name 
        ? `${settings.from_name} <${settings.from_email}>`
        : settings.from_email,
      to: body.to,
      subject: body.subject,
      content: "auto",
      html: finalHtml,
    };

    // Add CC if provided
    if (body.cc) {
      emailOptions.cc = body.cc;
    }

    // If PDF attachment requested
    if (body.attachPdf && body.pdfFilename && body.pdfBase64) {
      const filename = body.pdfFilename.replace(/\.(html|pdf)$/i, '') + '.pdf';
      console.log("Attaching real PDF:", filename);
      
      emailOptions.attachments = [
        {
          filename: filename,
          content: body.pdfBase64,
          encoding: "base64",
          contentType: "application/pdf",
        }
      ];
    }

    // Send email
    let emailStatus = 'sent';
    let errorMessage = null;
    
    try {
      await client.send(emailOptions);
      await client.close();
      console.log("Email sent successfully to:", body.to);
    } catch (sendError: unknown) {
      console.error("Error sending email:", sendError);
      emailStatus = 'failed';
      errorMessage = sendError instanceof Error ? sendError.message : "Error desconocido";
    }

    // Always log to email_logs table
    const logEntry = {
      recipient_email: body.to,
      recipient_name: null,
      sender_email: settings.from_email,
      sender_name: settings.from_name || null,
      subject: body.subject,
      body_preview: body.html?.substring(0, 500) || null,
      status: emailStatus,
      provider: settings.provider || 'smtp',
      entity_type: body.entityType || null,
      entity_id: body.entityId || null,
      attachment_count: body.attachPdf && body.pdfBase64 ? 1 : 0,
      attachments: body.pdfFilename ? [{ name: body.pdfFilename, type: 'application/pdf' }] : null,
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    };

    const { error: logError } = await supabase.from("email_logs").insert(logEntry);
    if (logError) {
      console.error("Error logging email:", logError);
    }

    // Also log to notification_queue if entity-related
    if (body.entityType && body.entityId) {
      await supabase.from("notification_queue").insert({
        rule_type: "manual_send",
        entity_type: body.entityType,
        entity_id: body.entityId,
        status: emailStatus,
        sent_at: new Date().toISOString(),
        error_message: errorMessage,
      });
    }

    // If email failed, throw error after logging
    if (emailStatus === 'failed') {
      throw new Error(`Error al enviar email: ${errorMessage}`);
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
