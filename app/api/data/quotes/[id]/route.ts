import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteServices } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuoteFull(q: any) {
  return {
    id: q.id,
    quote_number: q.quoteNumber,
    name: q.name,
    client_id: q.clientId,
    contact_id: q.contactId,
    status: q.status,
    valid_until: q.validUntil,
    subtotal: toNum(q.subtotal),
    iva_total: toNum(q.ivaTotal),
    total: toNum(q.total),
    notes: q.notes,
    document_url: q.documentUrl,
    is_sent: q.isSent,
    sent_at: dateToStr(q.sentAt),
    created_by: q.createdBy,
    created_at: dateToStr(q.createdAt) ?? "",
    updated_at: dateToStr(q.updatedAt) ?? "",
    client: q.client ?? null,
    contact: q.contact ?? null,
    services: q.services
      ? q.services.map((s: any) => ({
          id: s.id,
          quote_id: s.quoteId,
          service_id: s.serviceId,
          quantity: s.quantity,
          unit_price: toNum(s.unitPrice),
          discount_percent: toNum(s.discountPercent),
          discount_amount: toNum(s.discountAmount),
          subtotal: toNum(s.subtotal),
          iva_percent: toNum(s.ivaPercent),
          iva_amount: toNum(s.ivaAmount),
          total: toNum(s.total),
          service: s.service
            ? { id: s.service.id, name: s.service.name, description: s.service.description }
            : null,
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
    const row = await db.query.quotes.findFirst({
      where: eq(quotes.id, id),
      with: {
        client: true,
        contact: true,
        services: {
          with: { service: { columns: { id: true, name: true, description: true } } },
        },
      },
    });
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapQuoteFull(row));
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
      const [updated] = await db.update(quotes).set({
        status: body.status as "borrador" | "enviado" | "aceptado" | "rechazado",
        updatedAt: new Date(),
      }).where(eq(quotes.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapQuoteFull({ ...updated, services: [], client: null, contact: null }));
    }

    if (action === "mark-sent") {
      const [updated] = await db.update(quotes).set({
        isSent: true,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(quotes.id, id)).returning();
      if (!updated) return apiError("No encontrado", 404);
      return NextResponse.json(mapQuoteFull({ ...updated, services: [], client: null, contact: null }));
    }

    const update: Partial<typeof quotes.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string | null;
    if (body.client_id !== undefined) update.clientId = body.client_id as string | null;
    if (body.contact_id !== undefined) update.contactId = body.contact_id as string | null;
    if (body.status !== undefined) update.status = body.status as "borrador" | "enviado" | "aceptado" | "rechazado";
    if (body.valid_until !== undefined) update.validUntil = body.valid_until as string | null;
    if (body.subtotal !== undefined) update.subtotal = String(body.subtotal);
    if (body.iva_total !== undefined) update.ivaTotal = String(body.iva_total);
    if (body.total !== undefined) update.total = String(body.total);
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.document_url !== undefined) update.documentUrl = body.document_url as string | null;
    if (body.is_sent !== undefined) update.isSent = body.is_sent as boolean;
    if (body.sent_at !== undefined) update.sentAt = body.sent_at ? new Date(body.sent_at as string) : null;
    update.updatedAt = new Date();

    const [updated] = await db.update(quotes).set(update).where(eq(quotes.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);

    if (body.services !== undefined) {
      await db.delete(quoteServices).where(eq(quoteServices.quoteId, id));
      const servicesArray = body.services as Record<string, unknown>[];
      if (servicesArray.length > 0) {
        await db.insert(quoteServices).values(
          servicesArray.map((s) => ({
            quoteId: id,
            serviceId: s.service_id as string,
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

    const full = await db.query.quotes.findFirst({
      where: eq(quotes.id, id),
      with: {
        client: true,
        contact: true,
        services: {
          with: { service: { columns: { id: true, name: true, description: true } } },
        },
      },
    });
    return NextResponse.json(mapQuoteFull(full));
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
    await db.delete(quotes).where(eq(quotes.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
