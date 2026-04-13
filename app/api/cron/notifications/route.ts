/**
 * POST /api/cron/notifications
 *
 * Evaluates all active notification rules and sends emails for matching entities.
 * Skips entities already notified recently (dedup via notification_queue).
 *
 * Secured by:
 *  - Session (manual "run now" from Settings)
 *  - OR CRON_SECRET header (for external scheduler like EasyPanel cron / GitHub Actions)
 *
 * Returns: { sent: number, skipped: number, errors: number, details: [...] }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  notificationRules,
  notificationQueue,
  emailTemplates,
  invoices,
  contracts,
  quotes,
  clients,
  companySettings,
  emailSettings,
} from "@/lib/schema";
import { eq, and, gte, lte, inArray, isNull } from "drizzle-orm";
import { sendMail } from "@/lib/mailer";
import { apiError } from "@/lib/api-server";
import { requireSession } from "@/lib/api-server";

// ── Auth: session OR CRON_SECRET header ───────────────────────────────────────

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("x-cron-secret") === cronSecret) {
    return true;
  }
  const { response } = await requireSession(request);
  return !response;
}

// ── Template variable interpolation ───────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

// ── Dedup: has this entity+rule been notified in the last N days? ──────────────

async function alreadyNotified(ruleType: string, entityId: string, daysThreshold: number): Promise<boolean> {
  const since = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
  const [existing] = await db
    .select({ id: notificationQueue.id })
    .from(notificationQueue)
    .where(
      and(
        eq(notificationQueue.ruleType, ruleType),
        eq(notificationQueue.entityId, entityId),
        inArray(notificationQueue.status, ["sent", "pending"]),
        gte(notificationQueue.createdAt, since)
      )
    )
    .limit(1);
  return !!existing;
}

// ── Log to notification_queue ──────────────────────────────────────────────────

async function logNotification(
  ruleType: string,
  entityType: string,
  entityId: string,
  clientId: string | null,
  status: "sent" | "failed" | "pending",
  errorMessage?: string
) {
  await db.insert(notificationQueue).values({
    ruleType,
    entityType,
    entityId,
    clientId,
    status,
    sentAt: status === "sent" ? new Date() : null,
    errorMessage: errorMessage ?? null,
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = { sent: 0, skipped: 0, errors: 0, details: [] as string[] };

  try {
    // Load active rules with their templates
    const rules = await db.query.notificationRules.findMany({
      where: eq(notificationRules.isActive, true),
    });
    // Load templates separately to avoid Drizzle relation typing issues
    const allTemplates = await db.select().from(emailTemplates);
    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));

    if (rules.length === 0) {
      return NextResponse.json({ ...results, details: ["No hay reglas activas"] });
    }

    // Company and SMTP settings
    const [company] = await db.select().from(companySettings).limit(1);
    const [smtp] = await db.select().from(emailSettings).limit(1);

    if (!smtp?.isActive) {
      return NextResponse.json({ error: "Email SMTP no configurado o inactivo" }, { status: 400 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    for (const rule of rules) {
      const threshold = rule.daysThreshold ?? 3;
      const targetDate = new Date(today.getTime() + threshold * 24 * 60 * 60 * 1000);
      const targetStr = targetDate.toISOString().split("T")[0];

      const ruleType = rule.ruleType;

      // ── invoice_due_* ──────────────────────────────────────────────────────
      if (ruleType.startsWith("invoice_due") || ruleType === "invoice_overdue") {
        const isOverdue = ruleType === "invoice_overdue";
        const matchingInvoices = await db.query.invoices.findMany({
          where: and(
            eq(invoices.status, "emitida"),
            isOverdue
              ? lte(invoices.dueDate, todayStr)
              : and(gte(invoices.dueDate, todayStr), lte(invoices.dueDate, targetStr))
          ),
          with: { client: true },
        });

        for (const inv of matchingInvoices) {
          if (!inv.client?.email) { results.skipped++; continue; }
          if (await alreadyNotified(ruleType, inv.id, threshold)) { results.skipped++; continue; }

          const vars = {
            client_name: inv.client.name ?? "",
            company_name: company?.name ?? "CRM Nexo",
            invoice_number: `FF-${String(inv.invoiceNumber).padStart(4, "0")}`,
            total: `${Number(inv.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
            due_date: inv.dueDate ?? "",
            days: threshold,
          };

          const tpl = rule.templateId ? templateMap.get(rule.templateId) : undefined;
          const subject = tpl?.subject
            ? interpolate(tpl.subject, vars)
            : `${isOverdue ? "Factura vencida" : "Recordatorio"}: ${vars.invoice_number}`;

          const html = tpl?.bodyHtml
            ? interpolate(tpl.bodyHtml, vars)
            : `<p>Estimado/a ${vars.client_name},</p><p>Le recordamos que la factura <strong>${vars.invoice_number}</strong> por importe de ${vars.total} ${isOverdue ? "ha vencido" : `vence el ${vars.due_date}`}.</p><p>Atentamente,<br>${vars.company_name}</p>`;

          const mailResult = await sendMail({ to: inv.client.email, subject, html });

          if (mailResult.ok) {
            await logNotification(ruleType, "invoice", inv.id, inv.client.id, "sent");
            results.sent++;
            results.details.push(`✓ Factura ${vars.invoice_number} → ${inv.client.email}`);
          } else {
            await logNotification(ruleType, "invoice", inv.id, inv.client.id, "failed", mailResult.error);
            results.errors++;
            results.details.push(`✗ Factura ${vars.invoice_number}: ${mailResult.error}`);
          }
        }
      }

      // ── contract_expiring ─────────────────────────────────────────────────
      if (ruleType === "contract_expiring") {
        const matchingContracts = await db.query.contracts.findMany({
          where: and(
            eq(contracts.status, "vigente"),
            gte(contracts.endDate, todayStr),
            lte(contracts.endDate, targetStr)
          ),
          with: { client: true },
        });

        for (const contract of matchingContracts) {
          if (!contract.client?.email) { results.skipped++; continue; }
          if (await alreadyNotified(ruleType, contract.id, threshold)) { results.skipped++; continue; }

          const vars = {
            client_name: contract.client.name ?? "",
            company_name: company?.name ?? "CRM Nexo",
            contract_number: `CT-${String(contract.contractNumber).padStart(4, "0")}`,
            end_date: contract.endDate ?? "",
            days: threshold,
          };

          const tpl = rule.templateId ? templateMap.get(rule.templateId) : undefined;
          const subject = tpl?.subject
            ? interpolate(tpl.subject, vars)
            : `Contrato por vencer: ${vars.contract_number}`;

          const html = tpl?.bodyHtml
            ? interpolate(tpl.bodyHtml, vars)
            : `<p>Estimado/a ${vars.client_name},</p><p>Le informamos que el contrato <strong>${vars.contract_number}</strong> vence el <strong>${vars.end_date}</strong> (en ${vars.days} días).</p><p>Atentamente,<br>${vars.company_name}</p>`;

          const mailResult = await sendMail({ to: contract.client.email, subject, html });

          if (mailResult.ok) {
            await logNotification(ruleType, "contract", contract.id, contract.client.id, "sent");
            results.sent++;
            results.details.push(`✓ Contrato ${vars.contract_number} → ${contract.client.email}`);
          } else {
            await logNotification(ruleType, "contract", contract.id, contract.client.id, "failed", mailResult.error);
            results.errors++;
            results.details.push(`✗ Contrato ${vars.contract_number}: ${mailResult.error}`);
          }
        }
      }

      // ── contract_pending ──────────────────────────────────────────────────
      if (ruleType === "contract_pending") {
        const matchingContracts = await db.query.contracts.findMany({
          where: eq(contracts.status, "pendiente_activacion"),
          with: { client: true },
        });

        for (const contract of matchingContracts) {
          if (!contract.client?.email) { results.skipped++; continue; }
          if (await alreadyNotified(ruleType, contract.id, threshold)) { results.skipped++; continue; }

          const vars = {
            client_name: contract.client.name ?? "",
            company_name: company?.name ?? "CRM Nexo",
            contract_number: `CT-${String(contract.contractNumber).padStart(4, "0")}`,
            days: threshold,
          };

          const tpl = rule.templateId ? templateMap.get(rule.templateId) : undefined;
          const subject = tpl?.subject
            ? interpolate(tpl.subject, vars)
            : `Contrato pendiente de activación: ${vars.contract_number}`;

          const html = tpl?.bodyHtml
            ? interpolate(tpl.bodyHtml, vars)
            : `<p>Estimado/a ${vars.client_name},</p><p>El contrato <strong>${vars.contract_number}</strong> está pendiente de activación.</p><p>Atentamente,<br>${vars.company_name}</p>`;

          const mailResult = await sendMail({ to: contract.client.email, subject, html });

          if (mailResult.ok) {
            await logNotification(ruleType, "contract", contract.id, contract.client.id, "sent");
            results.sent++;
            results.details.push(`✓ Contrato pendiente ${vars.contract_number} → ${contract.client.email}`);
          } else {
            await logNotification(ruleType, "contract", contract.id, contract.client.id, "failed", mailResult.error);
            results.errors++;
            results.details.push(`✗ Contrato ${vars.contract_number}: ${mailResult.error}`);
          }
        }
      }

      // ── quote_no_response ─────────────────────────────────────────────────
      if (ruleType === "quote_no_response") {
        const matchingQuotes = await db.query.quotes.findMany({
          where: and(
            inArray(quotes.status, ["enviado"]),
            gte(quotes.validUntil, todayStr),
            lte(quotes.validUntil, targetStr)
          ),
          with: { client: true },
        });

        for (const quote of matchingQuotes) {
          if (!quote.client?.email) { results.skipped++; continue; }
          if (await alreadyNotified(ruleType, quote.id, threshold)) { results.skipped++; continue; }

          const vars = {
            client_name: quote.client.name ?? "",
            company_name: company?.name ?? "CRM Nexo",
            quote_number: `PP-${String(quote.quoteNumber).padStart(4, "0")}`,
            total: `${Number(quote.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
            due_date: quote.validUntil ?? "",
            days: threshold,
          };

          const tpl = rule.templateId ? templateMap.get(rule.templateId) : undefined;
          const subject = tpl?.subject
            ? interpolate(tpl.subject, vars)
            : `Seguimiento presupuesto: ${vars.quote_number}`;

          const html = tpl?.bodyHtml
            ? interpolate(tpl.bodyHtml, vars)
            : `<p>Estimado/a ${vars.client_name},</p><p>Queremos recordarle que el presupuesto <strong>${vars.quote_number}</strong> por ${vars.total} caduca el <strong>${vars.due_date}</strong>.</p><p>Atentamente,<br>${vars.company_name}</p>`;

          const mailResult = await sendMail({ to: quote.client.email, subject, html });

          if (mailResult.ok) {
            await logNotification(ruleType, "quote", quote.id, quote.client.id, "sent");
            results.sent++;
            results.details.push(`✓ Presupuesto ${vars.quote_number} → ${quote.client.email}`);
          } else {
            await logNotification(ruleType, "quote", quote.id, quote.client.id, "failed", mailResult.error);
            results.errors++;
            results.details.push(`✗ Presupuesto ${vars.quote_number}: ${mailResult.error}`);
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    return apiError(String(e));
  }
}

// Also allow GET for simple health/trigger from external cron with secret
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secret = new URL(request.url).searchParams.get("secret");
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return POST(request);
}
