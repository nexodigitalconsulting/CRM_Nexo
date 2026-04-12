import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { desc } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(expenses).orderBy(desc(expenses.issueDate));
    return NextResponse.json(rows.map(mapExpense));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(expenses).values({
      expenseNumber: body.expense_number as string,
      supplierName: body.supplier_name as string,
      supplierCif: body.supplier_cif as string | null,
      invoiceNumber: body.invoice_number as string | null,
      idFactura: body.id_factura as string | null,
      concept: body.concept as string | null,
      issueDate: body.issue_date as string,
      dueDate: body.due_date as string | null,
      subtotal: body.subtotal !== undefined ? String(body.subtotal) : "0",
      ivaPercent: body.iva_percent !== undefined ? String(body.iva_percent) : "21.00",
      ivaAmount: body.iva_amount !== undefined ? String(body.iva_amount) : "0",
      irpfPercent: body.irpf_percent !== undefined ? String(body.irpf_percent) : "0",
      irpfAmount: body.irpf_amount !== undefined ? String(body.irpf_amount) : "0",
      total: body.total !== undefined ? String(body.total) : "0",
      currency: (body.currency as string) ?? "EUR",
      status: (body.status as string) ?? "pending",
      documentUrl: body.document_url as string | null,
      notes: body.notes as string | null,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapExpense(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
