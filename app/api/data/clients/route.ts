import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError, nextSeq } from "@/lib/api-server";

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

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  void user;
  try {
    const rows = await db.select().from(clients).orderBy(desc(clients.clientNumber));
    return NextResponse.json(rows.map(mapClient));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const clientNumber = await nextSeq(clients, clients.clientNumber);
    const [created] = await db.insert(clients).values({
      clientNumber,
      name: body.name as string,
      cif: body.cif as string | null,
      email: body.email as string | null,
      phone: body.phone as string | null,
      address: body.address as string | null,
      city: body.city as string | null,
      province: body.province as string | null,
      postalCode: body.postal_code as string | null,
      country: body.country as string | null,
      iban: body.iban as string | null,
      bic: body.bic as string | null,
      sepaMandateId: body.sepa_mandate_id as string | null,
      sepaMandateDate: body.sepa_mandate_date as string | null,
      sepaSequenceType: body.sepa_sequence_type as string | null,
      segment: body.segment as "corporativo" | "pyme" | "autonomo" | "particular" | null,
      status: (body.status as "activo" | "inactivo") ?? "activo",
      source: body.source as string | null,
      notes: body.notes as string | null,
      contactId: body.contact_id as string | null,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapClient(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
