import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { remittances } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError, nextSeq } from "@/lib/api-server";

function mapRemittance(r: typeof remittances.$inferSelect) {
  return {
    id: r.id,
    remittance_number: r.remittanceNumber,
    code: r.code,
    issue_date: r.issueDate,
    status: r.status,
    total_amount: toNum(r.totalAmount),
    invoice_count: r.invoiceCount,
    collection_date: r.collectionDate,
    sent_to_bank_at: dateToStr(r.sentToBankAt),
    paid_amount: toNum(r.paidAmount),
    cancelled_at: dateToStr(r.cancelledAt),
    cancelled_reason: r.cancelledReason,
    notes: r.notes,
    xml_file_url: r.xmlFileUrl,
    n19_file_url: r.n19FileUrl,
    created_by: r.createdBy,
    created_at: dateToStr(r.createdAt) ?? "",
    updated_at: dateToStr(r.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(remittances).orderBy(desc(remittances.remittanceNumber));
    return NextResponse.json(rows.map(mapRemittance));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const remittanceNumber = await nextSeq(remittances, remittances.remittanceNumber);
    const [created] = await db.insert(remittances).values({
      remittanceNumber,
      code: body.code as string | null,
      issueDate: (body.issue_date as string) ?? new Date().toISOString().slice(0, 10),
      status: (body.status as "pendiente" | "enviada" | "cobrada" | "parcial" | "devuelta" | "anulada" | "vencida") ?? "pendiente",
      totalAmount: body.total_amount !== undefined ? String(body.total_amount) : "0",
      invoiceCount: (body.invoice_count as number) ?? 0,
      collectionDate: body.collection_date as string | null,
      notes: body.notes as string | null,
      xmlFileUrl: body.xml_file_url as string | null,
      n19FileUrl: body.n19_file_url as string | null,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapRemittance(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
