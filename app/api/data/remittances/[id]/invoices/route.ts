import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, remittances, remittanceInvoices } from "@/lib/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

async function recalculateRemittance(remittanceId: string) {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(total), 0)`,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(invoices)
    .where(eq(invoices.remittanceId, remittanceId));

  await db.update(remittances).set({
    totalAmount: result?.total ?? "0",
    invoiceCount: result?.count ?? 0,
    updatedAt: new Date(),
  }).where(eq(remittances.id, remittanceId));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as { invoiceIds: string[]; action: "add" | "remove" };
    const { invoiceIds, action } = body;

    if (!invoiceIds || invoiceIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    if (action === "add") {
      // Update invoices.remittance_id FK
      await db.update(invoices).set({ remittanceId: id, updatedAt: new Date() }).where(inArray(invoices.id, invoiceIds));

      // Write audit rows — get amounts from invoices
      const invRows = await db.select({ id: invoices.id, total: invoices.total }).from(invoices).where(inArray(invoices.id, invoiceIds));
      const auditRows = invRows.map((inv) => ({
        remittanceId: id,
        invoiceId: inv.id,
        amount: inv.total ?? "0",
        addedBy: session.user.id as string,
      }));
      if (auditRows.length > 0) {
        await db.insert(remittanceInvoices).values(auditRows).onConflictDoNothing();
      }
    } else if (action === "remove") {
      await db.update(invoices).set({ remittanceId: null, updatedAt: new Date() }).where(
        inArray(invoices.id, invoiceIds)
      );
      // Remove audit rows
      await db.delete(remittanceInvoices).where(
        inArray(remittanceInvoices.invoiceId, invoiceIds)
      );
    }

    await recalculateRemittance(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(String(e));
  }
}
