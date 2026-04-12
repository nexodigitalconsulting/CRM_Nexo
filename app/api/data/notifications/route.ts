import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contracts, invoices, quotes } from "@/lib/schema";
import { eq, gte, lte, inArray, and } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;

  try {
    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split("T")[0];
    const in7Str = in7Days.toISOString().split("T")[0];
    const in30Str = in30Days.toISOString().split("T")[0];

    const [expiringContracts, dueInvoices, pendingBilling, pendingQuotes] = await Promise.all([
      // Contracts expiring in 30 days
      db.query.contracts.findMany({
        where: and(eq(contracts.status, "vigente"), gte(contracts.endDate, todayStr), lte(contracts.endDate, in30Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, contractNumber: true, name: true, endDate: true },
      }),
      // Invoices due in 7 days
      db.query.invoices.findMany({
        where: and(eq(invoices.status, "emitida"), gte(invoices.dueDate, todayStr), lte(invoices.dueDate, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, invoiceNumber: true, dueDate: true, total: true },
      }),
      // Contracts with billing due in 7 days
      db.query.contracts.findMany({
        where: and(eq(contracts.status, "vigente"), gte(contracts.nextBillingDate, todayStr), lte(contracts.nextBillingDate, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, contractNumber: true, name: true, nextBillingDate: true, total: true },
      }),
      // Pending quotes expiring in 7 days
      db.query.quotes.findMany({
        where: and(inArray(quotes.status, ["borrador", "enviado"]), gte(quotes.validUntil, todayStr), lte(quotes.validUntil, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, quoteNumber: true, name: true, validUntil: true, total: true },
      }),
    ]);

    const notifications: unknown[] = [];

    expiringContracts.forEach((c) => {
      notifications.push({
        id: `contract-${c.id}`,
        type: "contract_expiring",
        title: "Contrato por vencer",
        message: `El contrato ${c.name || `#${c.contractNumber}`} de ${c.client?.name || "Sin cliente"} vence el ${new Date(c.endDate!).toLocaleDateString("es-ES")}`,
        entityType: "contract",
        entityId: c.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    dueInvoices.forEach((inv) => {
      notifications.push({
        id: `invoice-${inv.id}`,
        type: "invoice_due",
        title: "Factura por vencer",
        message: `Factura FF-${String(inv.invoiceNumber).padStart(4, "0")} de ${inv.client?.name || "Sin cliente"} (${Number(toNum(inv.total)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}) vence pronto`,
        entityType: "invoice",
        entityId: inv.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    pendingBilling.forEach((c) => {
      notifications.push({
        id: `billing-${c.id}`,
        type: "billing_reminder",
        title: "Facturación pendiente",
        message: `Facturar ${c.name || `Contrato #${c.contractNumber}`} de ${c.client?.name || "Sin cliente"} - ${Number(toNum(c.total)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
        entityType: "contract",
        entityId: c.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    pendingQuotes.forEach((q) => {
      notifications.push({
        id: `quote-${q.id}`,
        type: "quote_pending",
        title: "Presupuesto por caducar",
        message: `Presupuesto PP-${String(q.quoteNumber).padStart(4, "0")} ${q.client?.name ? `de ${q.client.name}` : ""} caduca pronto`,
        entityType: "quote",
        entityId: q.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    return NextResponse.json(notifications);
  } catch (e) {
    return apiError(String(e));
  }
}
