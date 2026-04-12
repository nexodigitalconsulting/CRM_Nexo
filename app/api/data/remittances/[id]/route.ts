import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { remittances, invoices } from "@/lib/schema";
import { eq, isNull } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRemittanceFull(r: any) {
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
    invoices: r.invoices
      ? r.invoices.map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoiceNumber,
          issue_date: inv.issueDate,
          due_date: inv.dueDate,
          status: inv.status,
          total: toNum(inv.total),
          client: inv.client ?? null,
          payments: inv.payments ?? [],
        }))
      : [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const row = await db.query.remittances.findFirst({
      where: eq(remittances.id, id),
      with: {
        invoices: {
          with: {
            client: true,
          },
        },
      },
    });
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapRemittanceFull(row));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  try {
    const body = await request.json() as Record<string, unknown>;

    if (action === "mark-sent") {
      const [updated] = await db.update(remittances).set({
        status: "enviada",
        sentToBankAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(remittances.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapRemittanceFull({ ...updated, invoices: [] }));
    }

    if (action === "cancel") {
      await db.update(invoices).set({ remittanceId: null, updatedAt: new Date() }).where(eq(invoices.remittanceId, id));
      const [updated] = await db.update(remittances).set({
        status: "anulada",
        cancelledAt: new Date(),
        cancelledReason: body.reason as string | null,
        updatedAt: new Date(),
      }).where(eq(remittances.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapRemittanceFull({ ...updated, invoices: [] }));
    }

    const update: Partial<typeof remittances.$inferInsert> = {};
    if (body.code !== undefined) update.code = body.code as string | null;
    if (body.issue_date !== undefined) update.issueDate = body.issue_date as string;
    if (body.status !== undefined) update.status = body.status as "pendiente" | "enviada" | "cobrada" | "parcial" | "devuelta" | "anulada" | "vencida";
    if (body.total_amount !== undefined) update.totalAmount = String(body.total_amount);
    if (body.invoice_count !== undefined) update.invoiceCount = body.invoice_count as number;
    if (body.collection_date !== undefined) update.collectionDate = body.collection_date as string | null;
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.xml_file_url !== undefined) update.xmlFileUrl = body.xml_file_url as string | null;
    if (body.n19_file_url !== undefined) update.n19FileUrl = body.n19_file_url as string | null;
    update.updatedAt = new Date();

    const [updated] = await db.update(remittances).set(update).where(eq(remittances.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapRemittanceFull({ ...updated, invoices: [] }));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    // Unlink invoices first
    await db.update(invoices).set({ remittanceId: null, updatedAt: new Date() }).where(eq(invoices.remittanceId, id));
    await db.delete(remittances).where(eq(remittances.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
