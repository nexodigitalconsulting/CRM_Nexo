import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceServices, contracts } from "@/lib/schema";
import { desc, eq, isNull, and, inArray } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError, nextSeq } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvoice(inv: any) {
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
    client: inv.client
      ? {
          id: inv.client.id,
          name: inv.client.name,
          cif: inv.client.cif,
          email: inv.client.email,
          iban: inv.client.iban,
        }
      : null,
    contract: inv.contract
      ? {
          id: inv.contract.id,
          name: inv.contract.name,
          billing_period: inv.contract.billingPeriod,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const clientId = searchParams.get("clientId");
  try {
    if (action === "available-for-remittance") {
      const rows = await db.query.invoices.findMany({
        where: and(eq(invoices.status, "emitida"), isNull(invoices.remittanceId)),
        with: {
          client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
          contract: { columns: { id: true, name: true, billingPeriod: true } },
        },
        orderBy: [desc(invoices.invoiceNumber)],
      });
      return NextResponse.json(rows.map(mapInvoice));
    }

    if (action === "contracts-for-client" && clientId) {
      const rows = await db.query.contracts.findMany({
        where: and(
          eq(contracts.clientId, clientId),
          inArray(contracts.status, ["vigente", "pendiente_activacion"])
        ),
        with: {
          client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
        },
      });
      return NextResponse.json(rows);
    }

    const rows = await db.query.invoices.findMany({
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
        contract: { columns: { id: true, name: true, billingPeriod: true } },
      },
      orderBy: [desc(invoices.invoiceNumber)],
    });
    return NextResponse.json(rows.map(mapInvoice));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as { invoice: Record<string, unknown>; services?: Record<string, unknown>[] };
    const inv = body.invoice;
    const invoiceNumber = await nextSeq(invoices, invoices.invoiceNumber);
    const [created] = await db.insert(invoices).values({
      invoiceNumber,
      clientId: inv.client_id as string,
      contractId: inv.contract_id as string | null,
      remittanceId: inv.remittance_id as string | null,
      issueDate: (inv.issue_date as string) ?? new Date().toISOString().slice(0, 10),
      dueDate: inv.due_date as string | null,
      status: (inv.status as "borrador" | "emitida" | "pagada" | "cancelada") ?? "borrador",
      subtotal: inv.subtotal !== undefined ? String(inv.subtotal) : "0",
      ivaPercent: inv.iva_percent !== undefined ? String(inv.iva_percent) : "21.00",
      ivaAmount: inv.iva_amount !== undefined ? String(inv.iva_amount) : "0",
      irpfPercent: inv.irpf_percent !== undefined ? String(inv.irpf_percent) : "0",
      irpfAmount: inv.irpf_amount !== undefined ? String(inv.irpf_amount) : "0",
      total: inv.total !== undefined ? String(inv.total) : "0",
      notes: inv.notes as string | null,
      documentUrl: inv.document_url as string | null,
      isSent: (inv.is_sent as boolean) ?? false,
      sentAt: inv.sent_at ? new Date(inv.sent_at as string) : null,
      createdBy: user.id,
    }).returning();

    if (body.services && body.services.length > 0) {
      await db.insert(invoiceServices).values(
        body.services.map((s) => ({
          invoiceId: created.id,
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

    const full = await db.query.invoices.findFirst({
      where: eq(invoices.id, created.id),
      with: {
        client: { columns: { id: true, name: true, cif: true, email: true, iban: true } },
        contract: { columns: { id: true, name: true, billingPeriod: true } },
      },
    });
    return NextResponse.json(mapInvoice(full), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
