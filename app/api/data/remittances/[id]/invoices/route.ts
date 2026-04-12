import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, remittances } from "@/lib/schema";
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
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as { invoiceIds: string[]; action: "add" | "remove" };
    const { invoiceIds, action } = body;

    if (!invoiceIds || invoiceIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    if (action === "add") {
      await db.update(invoices).set({ remittanceId: id, updatedAt: new Date() }).where(inArray(invoices.id, invoiceIds));
    } else if (action === "remove") {
      await db.update(invoices).set({ remittanceId: null, updatedAt: new Date() }).where(
        inArray(invoices.id, invoiceIds)
      );
    }

    await recalculateRemittance(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(String(e));
  }
}
