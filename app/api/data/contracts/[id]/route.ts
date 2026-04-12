import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contracts, contractServices } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContractFull(c: any) {
  return {
    id: c.id,
    contract_number: c.contractNumber,
    name: c.name,
    client_id: c.clientId,
    quote_id: c.quoteId,
    start_date: c.startDate,
    end_date: c.endDate,
    billing_period: c.billingPeriod,
    next_billing_date: c.nextBillingDate,
    status: c.status,
    payment_status: c.paymentStatus,
    subtotal: toNum(c.subtotal),
    iva_total: toNum(c.ivaTotal),
    total: toNum(c.total),
    notes: c.notes,
    document_url: c.documentUrl,
    is_sent: c.isSent,
    sent_at: dateToStr(c.sentAt),
    created_by: c.createdBy,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
    client: c.client ?? null,
    services: c.services
      ? c.services.map((s: any) => ({
          id: s.id,
          contract_id: s.contractId,
          service_id: s.serviceId,
          quantity: s.quantity,
          unit_price: toNum(s.unitPrice),
          discount_percent: toNum(s.discountPercent),
          discount_amount: toNum(s.discountAmount),
          subtotal: toNum(s.subtotal),
          iva_percent: toNum(s.ivaPercent),
          iva_amount: toNum(s.ivaAmount),
          total: toNum(s.total),
          is_active: s.isActive,
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
    const row = await db.query.contracts.findFirst({
      where: eq(contracts.id, id),
      with: {
        client: true,
        services: { with: { service: true } },
      },
    });
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapContractFull(row));
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
      const [updated] = await db.update(contracts).set({
        status: body.status as "vigente" | "expirado" | "cancelado" | "pendiente_activacion",
        updatedAt: new Date(),
      }).where(eq(contracts.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapContractFull({ ...updated, services: [], client: null }));
    }

    if (action === "mark-sent") {
      const [updated] = await db.update(contracts).set({
        isSent: true,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(contracts.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapContractFull({ ...updated, services: [], client: null }));
    }

    const update: Partial<typeof contracts.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string | null;
    if (body.client_id !== undefined) update.clientId = body.client_id as string;
    if (body.quote_id !== undefined) update.quoteId = body.quote_id as string | null;
    if (body.start_date !== undefined) update.startDate = body.start_date as string;
    if (body.end_date !== undefined) update.endDate = body.end_date as string | null;
    if (body.billing_period !== undefined) update.billingPeriod = body.billing_period as "mensual" | "trimestral" | "anual" | "unico" | "otro";
    if (body.next_billing_date !== undefined) update.nextBillingDate = body.next_billing_date as string | null;
    if (body.status !== undefined) update.status = body.status as "vigente" | "expirado" | "cancelado" | "pendiente_activacion";
    if (body.payment_status !== undefined) update.paymentStatus = body.payment_status as "pagado" | "pendiente" | "parcial" | "reclamado";
    if (body.subtotal !== undefined) update.subtotal = String(body.subtotal);
    if (body.iva_total !== undefined) update.ivaTotal = String(body.iva_total);
    if (body.total !== undefined) update.total = String(body.total);
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.document_url !== undefined) update.documentUrl = body.document_url as string | null;
    if (body.is_sent !== undefined) update.isSent = body.is_sent as boolean;
    if (body.sent_at !== undefined) update.sentAt = body.sent_at ? new Date(body.sent_at as string) : null;
    update.updatedAt = new Date();

    const [updated] = await db.update(contracts).set(update).where(eq(contracts.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);

    if (body.services !== undefined) {
      await db.delete(contractServices).where(eq(contractServices.contractId, id));
      const servicesArray = body.services as Record<string, unknown>[];
      if (servicesArray.length > 0) {
        await db.insert(contractServices).values(
          servicesArray.map((s) => ({
            contractId: id,
            serviceId: s.service_id as string,
            quantity: (s.quantity as number) ?? 1,
            unitPrice: String(s.unit_price ?? "0"),
            discountPercent: s.discount_percent !== undefined ? String(s.discount_percent) : "0",
            discountAmount: s.discount_amount !== undefined ? String(s.discount_amount) : "0",
            subtotal: String(s.subtotal ?? "0"),
            ivaPercent: s.iva_percent !== undefined ? String(s.iva_percent) : "21.00",
            ivaAmount: s.iva_amount !== undefined ? String(s.iva_amount) : "0",
            total: String(s.total ?? "0"),
            isActive: (s.is_active as boolean) ?? true,
          }))
        );
      }
    }

    const full = await db.query.contracts.findFirst({
      where: eq(contracts.id, id),
      with: {
        client: true,
        services: { with: { service: true } },
      },
    });
    return NextResponse.json(mapContractFull(full));
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
    await db.delete(contracts).where(eq(contracts.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
