import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceServices } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvoiceFull(inv: any) {
  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    client_id: inv.clientId,
    contract_id: inv.contractId,
    remittance_id: inv.remittanceId,
    issue_date: inv.issueDate,
    due_date: inv.dueDate,
    status: inv.status,
    subtotal: toNum(inv.subtotal),
    iva_percent: toNum(inv.ivaPercent),
    iva_amount: toNum(inv.ivaAmount),
    irpf_percent: toNum(inv.irpfPercent),
    irpf_amount: toNum(inv.irpfAmount),
    total: toNum(inv.total),
    notes: inv.notes,
    document_url: inv.documentUrl,
    is_sent: inv.isSent,
    sent_at: dateToStr(inv.sentAt),
    created_by: inv.createdBy,
    created_at: dateToStr(inv.createdAt) ?? "",
    updated_at: dateToStr(inv.updatedAt) ?? "",
    client: inv.client ?? null,
    contract: inv.contract ?? null,
    services: inv.services
      ? inv.services.map((s: any) => ({
          id: s.id,
          invoice_id: s.invoiceId,
          service_id: s.serviceId,
          description: s.description,
          quantity: s.quantity,
          unit_price: toNum(s.unitPrice),
          discount_percent: toNum(s.discountPercent),
          discount_amount: toNum(s.discountAmount),
          subtotal: toNum(s.subtotal),
          iva_percent: toNum(s.ivaPercent),
          iva_amount: toNum(s.ivaAmount),
          total: toNum(s.total),
          service: s.service ?? null,
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
    const row = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        client: true,
        contract: true,
        services: {
          with: { service: true },
        },
      },
    });
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapInvoiceFull(row));
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

    if (action === "status") {
      const [updated] = await db.update(invoices).set({
        status: body.status as "borrador" | "emitida" | "pagada" | "cancelada",
        updatedAt: new Date(),
      }).where(eq(invoices.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapInvoiceFull({ ...updated, services: [], client: null, contract: null }));
    }

    if (action === "mark-sent") {
      const [updated] = await db.update(invoices).set({
        isSent: true,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(invoices.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapInvoiceFull({ ...updated, services: [], client: null, contract: null }));
    }

    const update: Partial<typeof invoices.$inferInsert> = {};
    if (body.client_id !== undefined) update.clientId = body.client_id as string;
    if (body.contract_id !== undefined) update.contractId = body.contract_id as string | null;
    if (body.remittance_id !== undefined) update.remittanceId = body.remittance_id as string | null;
    if (body.issue_date !== undefined) update.issueDate = body.issue_date as string;
    if (body.due_date !== undefined) update.dueDate = body.due_date as string | null;
    if (body.status !== undefined) update.status = body.status as "borrador" | "emitida" | "pagada" | "cancelada";
    if (body.subtotal !== undefined) update.subtotal = String(body.subtotal);
    if (body.iva_percent !== undefined) update.ivaPercent = String(body.iva_percent);
    if (body.iva_amount !== undefined) update.ivaAmount = String(body.iva_amount);
    if (body.irpf_percent !== undefined) update.irpfPercent = String(body.irpf_percent);
    if (body.irpf_amount !== undefined) update.irpfAmount = String(body.irpf_amount);
    if (body.total !== undefined) update.total = String(body.total);
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.document_url !== undefined) update.documentUrl = body.document_url as string | null;
    if (body.is_sent !== undefined) update.isSent = body.is_sent as boolean;
    if (body.sent_at !== undefined) update.sentAt = body.sent_at ? new Date(body.sent_at as string) : null;
    update.updatedAt = new Date();

    const [updated] = await db.update(invoices).set(update).where(eq(invoices.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);

    if (body.services !== undefined) {
      await db.delete(invoiceServices).where(eq(invoiceServices.invoiceId, id));
      const servicesArray = body.services as Record<string, unknown>[];
      if (servicesArray.length > 0) {
        await db.insert(invoiceServices).values(
          servicesArray.map((s) => ({
            invoiceId: id,
            serviceId: s.service_id as string,
            description: s.description as string | null,
            quantity: (s.quantity as number) ?? 1,
            unitPrice: String(s.unit_price ?? "0"),
            discountPercent: s.discount_percent !== undefined ? String(s.discount_percent) : "0",
            discountAmount: s.discount_amount !== undefined ? String(s.discount_amount) : "0",
            subtotal: String(s.subtotal ?? "0"),
            ivaPercent: s.iva_percent !== undefined ? String(s.iva_percent) : "21.00",
            ivaAmount: s.iva_amount !== undefined ? String(s.iva_amount) : "0",
            total: String(s.total ?? "0"),
          }))
        );
      }
    }

    const full = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        client: true,
        contract: true,
        services: { with: { service: true } },
      },
    });
    return NextResponse.json(mapInvoiceFull(full));
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
    await db.delete(invoices).where(eq(invoices.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
