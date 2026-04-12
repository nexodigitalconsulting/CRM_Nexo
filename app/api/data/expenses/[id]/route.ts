import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

function mapExpense(e: typeof expenses.$inferSelect) {
  return {
    id: e.id,
    expense_number: e.expenseNumber,
    supplier_name: e.supplierName,
    supplier_cif: e.supplierCif,
    invoice_number: e.invoiceNumber,
    id_factura: e.idFactura,
    concept: e.concept,
    issue_date: e.issueDate,
    due_date: e.dueDate,
    subtotal: toNum(e.subtotal),
    iva_percent: toNum(e.ivaPercent),
    iva_amount: toNum(e.ivaAmount),
    irpf_percent: toNum(e.irpfPercent),
    irpf_amount: toNum(e.irpfAmount),
    total: toNum(e.total),
    currency: e.currency,
    status: e.status,
    document_url: e.documentUrl,
    notes: e.notes,
    created_by: e.createdBy,
    created_at: dateToStr(e.createdAt) ?? "",
    updated_at: dateToStr(e.updatedAt) ?? "",
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
    const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapExpense(row));
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
  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof expenses.$inferInsert> = {};
    if (body.supplier_name !== undefined) update.supplierName = body.supplier_name as string;
    if (body.supplier_cif !== undefined) update.supplierCif = body.supplier_cif as string | null;
    if (body.invoice_number !== undefined) update.invoiceNumber = body.invoice_number as string | null;
    if (body.id_factura !== undefined) update.idFactura = body.id_factura as string | null;
    if (body.concept !== undefined) update.concept = body.concept as string | null;
    if (body.issue_date !== undefined) update.issueDate = body.issue_date as string;
    if (body.due_date !== undefined) update.dueDate = body.due_date as string | null;
    if (body.subtotal !== undefined) update.subtotal = String(body.subtotal);
    if (body.iva_percent !== undefined) update.ivaPercent = String(body.iva_percent);
    if (body.iva_amount !== undefined) update.ivaAmount = String(body.iva_amount);
    if (body.irpf_percent !== undefined) update.irpfPercent = String(body.irpf_percent);
    if (body.irpf_amount !== undefined) update.irpfAmount = String(body.irpf_amount);
    if (body.total !== undefined) update.total = String(body.total);
    if (body.currency !== undefined) update.currency = body.currency as string;
    if (body.status !== undefined) update.status = body.status as string;
    if (body.document_url !== undefined) update.documentUrl = body.document_url as string | null;
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    update.updatedAt = new Date();
    const [updated] = await db.update(expenses).set(update).where(eq(expenses.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapExpense(updated));
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
    await db.delete(expenses).where(eq(expenses.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
