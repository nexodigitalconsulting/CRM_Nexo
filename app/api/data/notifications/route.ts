import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contracts, invoices, quotes, notifications } from "@/lib/schema";
import { eq, gte, lte, inArray, and } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationPayload {
  id: string;
  type: "contract_expiring" | "invoice_due" | "quote_pending" | "billing_reminder" | "general";
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

// ── GET — generate + persist + merge read state ────────────────────────────────

export async function GET(request: NextRequest) {
  const { session, response } = await requireSession(request);
  if (response) return response;
  const userId = session.user.id as string;

  try {
    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split("T")[0];
    const in7Str = in7Days.toISOString().split("T")[0];
    const in30Str = in30Days.toISOString().split("T")[0];

    const [expiringContracts, dueInvoices, pendingBilling, pendingQuotes] = await Promise.all([
      db.query.contracts.findMany({
        where: and(eq(contracts.status, "vigente"), gte(contracts.endDate, todayStr), lte(contracts.endDate, in30Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, contractNumber: true, name: true, endDate: true },
      }),
      db.query.invoices.findMany({
        where: and(eq(invoices.status, "emitida"), gte(invoices.dueDate, todayStr), lte(invoices.dueDate, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, invoiceNumber: true, dueDate: true, total: true },
      }),
      db.query.contracts.findMany({
        where: and(eq(contracts.status, "vigente"), gte(contracts.nextBillingDate, todayStr), lte(contracts.nextBillingDate, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, contractNumber: true, name: true, nextBillingDate: true, total: true },
      }),
      db.query.quotes.findMany({
        where: and(inArray(quotes.status, ["borrador", "enviado"]), gte(quotes.validUntil, todayStr), lte(quotes.validUntil, in7Str)),
        with: { client: { columns: { name: true } } },
        columns: { id: true, quoteNumber: true, name: true, validUntil: true, total: true },
      }),
    ]);

    // Build fresh notification list from business data
    const generated: NotificationPayload[] = [];

    expiringContracts.forEach((c) => {
      generated.push({
        id: `contract-expiring-${c.id}`,
        type: "contract_expiring",
        title: "Contrato por vencer",
        message: `El contrato ${c.name || `#${c.contractNumber}`} de ${c.client?.name || "Sin cliente"} vence el ${new Date(c.endDate!).toLocaleDateString("es-ES")}`,
        entityType: "contract",
        entityId: c.id,
        isRead: false,
        createdAt: today.toISOString(),
      });
    });

    dueInvoices.forEach((inv) => {
      generated.push({
        id: `invoice-due-${inv.id}`,
        type: "invoice_due",
        title: "Factura por vencer",
        message: `Factura FF-${String(inv.invoiceNumber).padStart(4, "0")} de ${inv.client?.name || "Sin cliente"} (${Number(toNum(inv.total)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}) vence pronto`,
        entityType: "invoice",
        entityId: inv.id,
        isRead: false,
        createdAt: today.toISOString(),
      });
    });

    pendingBilling.forEach((c) => {
      generated.push({
        id: `billing-${c.id}`,
        type: "billing_reminder",
        title: "Facturación pendiente",
        message: `Facturar ${c.name || `Contrato #${c.contractNumber}`} de ${c.client?.name || "Sin cliente"} - ${Number(toNum(c.total)).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
        entityType: "contract",
        entityId: c.id,
        isRead: false,
        createdAt: today.toISOString(),
      });
    });

    pendingQuotes.forEach((q) => {
      generated.push({
        id: `quote-pending-${q.id}`,
        type: "quote_pending",
        title: "Presupuesto por caducar",
        message: `Presupuesto PP-${String(q.quoteNumber).padStart(4, "0")} ${q.client?.name ? `de ${q.client.name}` : ""} caduca pronto`,
        entityType: "quote",
        entityId: q.id,
        isRead: false,
        createdAt: today.toISOString(),
      });
    });

    if (generated.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch read state from DB for this user
    const entityIds = generated.map((n) => n.entityId);
    const dbRows = await db
      .select({
        entityId: notifications.entityId,
        entityType: notifications.entityType,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.entityId, entityIds)
        )
      );

    // Build lookup: `${entityType}-${entityId}` → { isRead, createdAt }
    const dbMap = new Map<string, { isRead: boolean; createdAt: Date | null }>();
    for (const row of dbRows) {
      if (row.entityId) {
        dbMap.set(`${row.entityType}-${row.entityId}`, {
          isRead: row.isRead ?? false,
          createdAt: row.createdAt,
        });
      }
    }

    // Upsert new notifications (insert only; don't overwrite existing read state)
    const newOnes = generated.filter((n) => !dbMap.has(`${n.entityType}-${n.entityId}`));
    if (newOnes.length > 0) {
      await db.insert(notifications).values(
        newOnes.map((n) => ({
          userId,
          type: n.type,
          title: n.title,
          message: n.message,
          entityType: n.entityType,
          entityId: n.entityId,
          isRead: false,
        }))
      ).onConflictDoNothing();
    }

    // Merge isRead from DB
    const result = generated.map((n) => {
      const key = `${n.entityType}-${n.entityId}`;
      const db = dbMap.get(key);
      return {
        ...n,
        isRead: db?.isRead ?? false,
        createdAt: db?.createdAt ? (db.createdAt as Date).toISOString() : n.createdAt,
      };
    });

    return NextResponse.json(result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (e) {
    return apiError(String(e));
  }
}

// ── PATCH — mark read ──────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireSession(request);
  if (response) return response;
  const userId = session.user.id as string;

  try {
    const body = await request.json() as { entityId?: string; entityType?: string; all?: boolean };

    if (body.all) {
      // Mark all as read for this user
      await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
    } else if (body.entityId && body.entityType) {
      // Mark one as read
      await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.entityId, body.entityId),
          eq(notifications.entityType, body.entityType)
        )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(String(e));
  }
}
