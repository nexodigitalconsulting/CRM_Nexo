import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { remittancePayments, invoices, remittances } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as {
      payments: Array<{
        invoice_id: string;
        amount: number;
        payment_date: string;
        status: string;
        return_reason?: string;
      }>;
      userId: string;
    };

    // 1. Insert payments
    if (body.payments && body.payments.length > 0) {
      await db.insert(remittancePayments).values(
        body.payments.map((p) => ({
          remittanceId: id,
          invoiceId: p.invoice_id,
          amount: String(p.amount),
          paymentDate: p.payment_date,
          status: p.status ?? "cobrado",
          returnReason: p.return_reason ?? null,
          createdBy: body.userId,
        }))
      );

      // 2. Update invoice statuses
      for (const p of body.payments) {
        const newStatus = p.status === "cobrado" ? "pagada" : "emitida";
        await db.update(invoices).set({ status: newStatus as "borrador" | "emitida" | "pagada" | "cancelada", updatedAt: new Date() }).where(eq(invoices.id, p.invoice_id));
      }
    }

    // 3. Recalculate remittance paid amount and status
    const [paidResult] = await db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(remittancePayments)
      .where(eq(remittancePayments.remittanceId, id));

    const paidAmount = parseFloat(paidResult?.total ?? "0");

    const [remResult] = await db.select().from(remittances).where(eq(remittances.id, id));
    const totalAmount = parseFloat(String(remResult?.totalAmount ?? "0"));

    let newStatus: "pendiente" | "enviada" | "cobrada" | "parcial" | "devuelta" | "anulada" | "vencida" = "pendiente";
    if (paidAmount >= totalAmount && totalAmount > 0) {
      newStatus = "cobrada";
    } else if (paidAmount > 0) {
      newStatus = "parcial";
    }

    await db.update(remittances).set({
      paidAmount: String(paidAmount),
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(remittances.id, id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(String(e));
  }
}
