import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapClient(c: typeof clients.$inferSelect) {
  return {
    id: c.id,
    client_number: c.clientNumber,
    name: c.name,
    cif: c.cif,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    province: c.province,
    postal_code: c.postalCode,
    country: c.country,
    iban: c.iban,
    bic: c.bic,
    sepa_mandate_id: c.sepaMandateId,
    sepa_mandate_date: c.sepaMandateDate,
    sepa_sequence_type: c.sepaSequenceType,
    segment: c.segment,
    status: c.status,
    source: c.source,
    notes: c.notes,
    contact_id: c.contactId,
    created_by: c.createdBy,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
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
    const [row] = await db.select().from(clients).where(eq(clients.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapClient(row));
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
    const update: Partial<typeof clients.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.cif !== undefined) update.cif = body.cif as string | null;
    if (body.email !== undefined) update.email = body.email as string | null;
    if (body.phone !== undefined) update.phone = body.phone as string | null;
    if (body.address !== undefined) update.address = body.address as string | null;
    if (body.city !== undefined) update.city = body.city as string | null;
    if (body.province !== undefined) update.province = body.province as string | null;
    if (body.postal_code !== undefined) update.postalCode = body.postal_code as string | null;
    if (body.country !== undefined) update.country = body.country as string | null;
    if (body.iban !== undefined) update.iban = body.iban as string | null;
    if (body.bic !== undefined) update.bic = body.bic as string | null;
    if (body.sepa_mandate_id !== undefined) update.sepaMandateId = body.sepa_mandate_id as string | null;
    if (body.sepa_mandate_date !== undefined) update.sepaMandateDate = body.sepa_mandate_date as string | null;
    if (body.sepa_sequence_type !== undefined) update.sepaSequenceType = body.sepa_sequence_type as string | null;
    if (body.segment !== undefined) update.segment = body.segment as "corporativo" | "pyme" | "autonomo" | "particular" | null;
    if (body.status !== undefined) update.status = body.status as "activo" | "inactivo";
    if (body.source !== undefined) update.source = body.source as string | null;
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.contact_id !== undefined) update.contactId = body.contact_id as string | null;
    update.updatedAt = new Date();
    const [updated] = await db.update(clients).set(update).where(eq(clients.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapClient(updated));
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
    await db.delete(clients).where(eq(clients.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
