import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contracts, contractServices, quotes } from "@/lib/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError, nextSeq } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContract(c: any) {
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
    client: c.client
      ? {
          id: c.client.id,
          name: c.client.name,
          cif: c.client.cif,
          email: c.client.email,
          iban: c.client.iban,
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
    if (action === "approved-quotes") {
      const rows = await db.query.quotes.findMany({
        where: eq(quotes.status, "aceptado"),
        with: {
          client: { columns: { id: true, name: true, cif: true, email: true } },
          contact: { columns: { id: true, name: true, email: true } },
        },
        orderBy: [desc(quotes.quoteNumber)],
      });
      return NextResponse.json(rows);
    }

    if (action === "for-invoice") {
      const rows = await db.query.contracts.findMany({
        where: inArray(contracts.status, ["vigente", "pendiente_activacion"]),
        with: {
          client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
        },
        orderBy: [desc(contracts.contractNumber)],
      });
      return NextResponse.json(rows.map(mapContract));
    }

    const rows = await db.query.contracts.findMany({
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
      },
      orderBy: [desc(contracts.contractNumber)],
    });
    return NextResponse.json(rows.map(mapContract));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as { contract: Record<string, unknown>; services?: Record<string, unknown>[] };
    const c = body.contract;
    const contractNumber = await nextSeq(contracts, contracts.contractNumber);
    const [created] = await db.insert(contracts).values({
      contractNumber,
      name: c.name as string | null,
      clientId: c.client_id as string,
      quoteId: c.quote_id as string | null,
      startDate: c.start_date as string,
      endDate: c.end_date as string | null,
      billingPeriod: (c.billing_period as "mensual" | "trimestral" | "anual" | "unico" | "otro") ?? "mensual",
      nextBillingDate: c.next_billing_date as string | null,
      status: (c.status as "vigente" | "expirado" | "cancelado" | "pendiente_activacion") ?? "pendiente_activacion",
      paymentStatus: (c.payment_status as "pagado" | "pendiente" | "parcial" | "reclamado") ?? "pendiente",
      subtotal: c.subtotal !== undefined ? String(c.subtotal) : "0",
      ivaTotal: c.iva_total !== undefined ? String(c.iva_total) : "0",
      total: c.total !== undefined ? String(c.total) : "0",
      notes: c.notes as string | null,
      documentUrl: c.document_url as string | null,
      isSent: (c.is_sent as boolean) ?? false,
      sentAt: c.sent_at ? new Date(c.sent_at as string) : null,
      createdBy: user.id,
    }).returning();

    if (body.services && body.services.length > 0) {
      await db.insert(contractServices).values(
        body.services.map((s) => ({
          contractId: created.id,
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

    const full = await db.query.contracts.findFirst({
      where: eq(contracts.id, created.id),
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
      },
    });
    return NextResponse.json(mapContract(full), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
