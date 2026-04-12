import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, contacts } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError, nextSeq } from "@/lib/api-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as { clientData: Record<string, unknown>; userId: string };
    const { clientData } = body;

    const clientNumber = await nextSeq(clients, clients.clientNumber);
    const [newClient] = await db.insert(clients).values({
      clientNumber,
      name: clientData.name as string,
      cif: clientData.cif as string | null,
      email: clientData.email as string | null,
      phone: clientData.phone as string | null,
      address: clientData.address as string | null,
      city: clientData.city as string | null,
      province: clientData.province as string | null,
      postalCode: clientData.postal_code as string | null,
      country: (clientData.country as string | null) ?? "España",
      iban: clientData.iban as string | null,
      bic: clientData.bic as string | null,
      sepaMandateId: clientData.sepa_mandate_id as string | null,
      sepaMandateDate: clientData.sepa_mandate_date as string | null,
      sepaSequenceType: (clientData.sepa_sequence_type as string | null) ?? "RCUR",
      segment: (clientData.segment as "corporativo" | "pyme" | "autonomo" | "particular") ?? "pyme",
      status: (clientData.status as "activo" | "inactivo") ?? "activo",
      source: clientData.source as string | null,
      notes: clientData.notes as string | null,
      contactId: id,
      createdBy: clientData.created_by as string | null,
    }).returning();

    await db.update(contacts).set({ status: "convertido", updatedAt: new Date() }).where(eq(contacts.id, id));

    return NextResponse.json({ clientId: newClient.id }, { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
