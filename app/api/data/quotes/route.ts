import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteServices } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError, nextSeq } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuote(q: any) {
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
    client: q.client
      ? {
          id: q.client.id,
          name: q.client.name,
          cif: q.client.cif,
          email: q.client.email,
        }
      : null,
    contact: q.contact
      ? {
          id: q.contact.id,
          name: q.contact.name,
          email: q.contact.email,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  try {
    if (action === "approved") {
      const rows = await db.query.quotes.findMany({
        where: eq(quotes.status, "aceptado"),
        with: {
          client: { columns: { id: true, name: true, cif: true, email: true } },
          contact: { columns: { id: true, name: true, email: true } },
        },
        orderBy: [desc(quotes.quoteNumber)],
      });
      return NextResponse.json(rows.map(mapQuote));
    }
    const rows = await db.query.quotes.findMany({
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true } },
        contact: { columns: { id: true, name: true, email: true } },
      },
      orderBy: [desc(quotes.quoteNumber)],
    });
    return NextResponse.json(rows.map(mapQuote));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as { quote: Record<string, unknown>; services?: Record<string, unknown>[] };
    const q = body.quote;
    const quoteNumber = await nextSeq(quotes, quotes.quoteNumber);
    const [created] = await db.insert(quotes).values({
      quoteNumber,
      name: q.name as string | null,
      clientId: q.client_id as string | null,
      contactId: q.contact_id as string | null,
      status: (q.status as "borrador" | "enviado" | "aceptado" | "rechazado") ?? "borrador",
      validUntil: q.valid_until as string | null,
      subtotal: q.subtotal !== undefined ? String(q.subtotal) : "0",
      ivaTotal: q.iva_total !== undefined ? String(q.iva_total) : "0",
      total: q.total !== undefined ? String(q.total) : "0",
      notes: q.notes as string | null,
      documentUrl: q.document_url as string | null,
      isSent: (q.is_sent as boolean) ?? false,
      sentAt: q.sent_at ? new Date(q.sent_at as string) : null,
      createdBy: user.id,
    }).returning();

    if (body.services && body.services.length > 0) {
      await db.insert(quoteServices).values(
        body.services.map((s) => ({
          quoteId: created.id,
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

    const full = await db.query.quotes.findFirst({
      where: eq(quotes.id, created.id),
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true } },
        contact: { columns: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(mapQuote(full), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
