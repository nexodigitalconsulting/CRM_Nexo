import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0?target=deno";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationJob {
  ruleType: string;
  entityType: string;
  entityId: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  subject: string;
  html: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting notification processing...");

    // Get email settings
    const { data: emailSettings } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!emailSettings?.is_active) {
      console.log("Email sending is disabled, skipping notifications");
      return new Response(
        JSON.stringify({ message: "Email desactivado" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company settings for template variables
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const companyName = companySettings?.name || "La Empresa";

    // Get active notification rules
    const { data: rules } = await supabase
      .from("notification_rules")
      .select("*")
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      console.log("No active notification rules");
      return new Response(
        JSON.stringify({ message: "No hay reglas activas" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get templates
    const { data: templates } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    const templateMap = new Map(templates?.map(t => [t.template_type, t]) || []);

    const jobs: NotificationJob[] = [];
    const today = new Date();

    // Process each rule type
    for (const rule of rules) {
      console.log(`Processing rule: ${rule.rule_type}`);

      if (rule.rule_type === "invoice_due_3days") {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + rule.days_threshold);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        const { data: invoices } = await supabase
          .from("invoices")
          .select("*, clients!inner(id, name, email)")
          .eq("due_date", dueDateStr)
          .in("status", ["draft", "issued"]);

        const template = templateMap.get("invoice_due_reminder");
        if (invoices && template) {
          for (const inv of invoices) {
            if (inv.clients?.email && await isClientNotificationEnabled(supabase, inv.clients.id, rule.rule_type)) {
              jobs.push({
                ruleType: rule.rule_type,
                entityType: "invoice",
                entityId: inv.id,
                clientId: inv.clients.id,
                clientEmail: inv.clients.email,
                clientName: inv.clients.name,
                subject: replaceVariables(template.subject, { client_name: inv.clients.name, invoice_number: inv.invoice_number, total: inv.total, due_date: inv.due_date, days: rule.days_threshold, company_name: companyName }),
                html: replaceVariables(template.body_html, { client_name: inv.clients.name, invoice_number: inv.invoice_number, total: inv.total, due_date: inv.due_date, days: rule.days_threshold, company_name: companyName }),
              });
            }
          }
        }
      }

      if (rule.rule_type === "invoice_overdue") {
        const overdueDate = new Date(today);
        overdueDate.setDate(overdueDate.getDate() - rule.days_threshold);
        const overdueDateStr = overdueDate.toISOString().split("T")[0];

        const { data: invoices } = await supabase
          .from("invoices")
          .select("*, clients!inner(id, name, email)")
          .lt("due_date", overdueDateStr)
          .in("status", ["draft", "issued"]);

        const template = templateMap.get("invoice_overdue");
        if (invoices && template) {
          for (const inv of invoices) {
            if (inv.clients?.email && await isClientNotificationEnabled(supabase, inv.clients.id, rule.rule_type)) {
              const daysPast = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
              jobs.push({
                ruleType: rule.rule_type,
                entityType: "invoice",
                entityId: inv.id,
                clientId: inv.clients.id,
                clientEmail: inv.clients.email,
                clientName: inv.clients.name,
                subject: replaceVariables(template.subject, { client_name: inv.clients.name, invoice_number: inv.invoice_number, total: inv.total, due_date: inv.due_date, days: daysPast, company_name: companyName }),
                html: replaceVariables(template.body_html, { client_name: inv.clients.name, invoice_number: inv.invoice_number, total: inv.total, due_date: inv.due_date, days: daysPast, company_name: companyName }),
              });
            }
          }
        }
      }

      if (rule.rule_type === "contract_pending") {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("*, clients!inner(id, name, email)")
          .eq("status", "pending_activation");

        const template = templateMap.get("contract_pending");
        if (contracts && template) {
          for (const contract of contracts) {
            if (contract.clients?.email && await isClientNotificationEnabled(supabase, contract.clients.id, rule.rule_type)) {
              jobs.push({
                ruleType: rule.rule_type,
                entityType: "contract",
                entityId: contract.id,
                clientId: contract.clients.id,
                clientEmail: contract.clients.email,
                clientName: contract.clients.name,
                subject: replaceVariables(template.subject, { client_name: contract.clients.name, contract_number: contract.contract_number, company_name: companyName }),
                html: replaceVariables(template.body_html, { client_name: contract.clients.name, contract_number: contract.contract_number, company_name: companyName }),
              });
            }
          }
        }
      }

      if (rule.rule_type === "contract_expiring") {
        const expiryDate = new Date(today);
        expiryDate.setDate(expiryDate.getDate() + rule.days_threshold);
        const expiryDateStr = expiryDate.toISOString().split("T")[0];

        const { data: contracts } = await supabase
          .from("contracts")
          .select("*, clients!inner(id, name, email)")
          .eq("end_date", expiryDateStr)
          .eq("status", "active");

        const template = templateMap.get("contract_expiring");
        if (contracts && template) {
          for (const contract of contracts) {
            if (contract.clients?.email && await isClientNotificationEnabled(supabase, contract.clients.id, rule.rule_type)) {
              jobs.push({
                ruleType: rule.rule_type,
                entityType: "contract",
                entityId: contract.id,
                clientId: contract.clients.id,
                clientEmail: contract.clients.email,
                clientName: contract.clients.name,
                subject: replaceVariables(template.subject, { client_name: contract.clients.name, contract_number: contract.contract_number, end_date: contract.end_date, days: rule.days_threshold, company_name: companyName }),
                html: replaceVariables(template.body_html, { client_name: contract.clients.name, contract_number: contract.contract_number, end_date: contract.end_date, days: rule.days_threshold, company_name: companyName }),
              });
            }
          }
        }
      }

      if (rule.rule_type === "quote_no_response") {
        const sentDate = new Date(today);
        sentDate.setDate(sentDate.getDate() - rule.days_threshold);
        const sentDateStr = sentDate.toISOString().split("T")[0];

        const { data: quotes } = await supabase
          .from("quotes")
          .select("*, clients!inner(id, name, email)")
          .eq("status", "sent")
          .lt("created_at", sentDateStr + "T23:59:59");

        const template = templateMap.get("quote_followup");
        if (quotes && template) {
          for (const quote of quotes) {
            if (quote.clients?.email && await isClientNotificationEnabled(supabase, quote.clients.id, rule.rule_type)) {
              jobs.push({
                ruleType: rule.rule_type,
                entityType: "quote",
                entityId: quote.id,
                clientId: quote.clients.id,
                clientEmail: quote.clients.email,
                clientName: quote.clients.name,
                subject: replaceVariables(template.subject, { client_name: quote.clients.name, quote_number: quote.quote_number, days: rule.days_threshold, company_name: companyName }),
                html: replaceVariables(template.body_html, { client_name: quote.clients.name, quote_number: quote.quote_number, days: rule.days_threshold, company_name: companyName }),
              });
            }
          }
        }
      }
    }

    console.log(`Found ${jobs.length} notifications to send`);

    // Check for already sent notifications today
    const todayStr = today.toISOString().split("T")[0];
    const { data: sentToday } = await supabase
      .from("notification_queue")
      .select("entity_id, rule_type")
      .gte("created_at", todayStr + "T00:00:00")
      .eq("status", "sent");

    const sentSet = new Set(sentToday?.map(s => `${s.rule_type}-${s.entity_id}`) || []);

    // Filter out already sent notifications
    const pendingJobs = jobs.filter(j => !sentSet.has(`${j.ruleType}-${j.entityId}`));
    console.log(`${pendingJobs.length} new notifications to send`);

    if (pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay notificaciones pendientes", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: emailSettings.smtp_host,
        port: emailSettings.smtp_port,
        tls: emailSettings.smtp_secure,
        auth: {
          username: emailSettings.smtp_user,
          password: emailSettings.smtp_password,
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      try {
        await client.send({
          from: emailSettings.from_name 
            ? `${emailSettings.from_name} <${emailSettings.from_email}>`
            : emailSettings.from_email,
          to: job.clientEmail,
          subject: job.subject,
          content: "auto",
          html: job.html,
        });

        await supabase.from("notification_queue").insert({
          rule_type: job.ruleType,
          entity_type: job.entityType,
          entity_id: job.entityId,
          client_id: job.clientId,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        sent++;
        console.log(`Sent notification to ${job.clientEmail}`);
      } catch (sendError: unknown) {
        console.error(`Failed to send to ${job.clientEmail}:`, sendError);
        const errorMessage = sendError instanceof Error ? sendError.message : "Error desconocido";
        
        await supabase.from("notification_queue").insert({
          rule_type: job.ruleType,
          entity_type: job.entityType,
          entity_id: job.entityId,
          client_id: job.clientId,
          status: "failed",
          error_message: errorMessage,
        });

        failed++;
      }
    }

    await client.close();

    console.log(`Notification processing complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Procesamiento completado", 
        sent, 
        failed,
        total: pendingJobs.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in process-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function replaceVariables(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isClientNotificationEnabled(supabase: any, clientId: string, ruleType: string): Promise<boolean> {
  const { data } = await supabase
    .from("client_notification_preferences")
    .select("is_enabled")
    .eq("client_id", clientId)
    .eq("rule_type", ruleType)
    .maybeSingle();
  
  return data?.is_enabled ?? true;
}
