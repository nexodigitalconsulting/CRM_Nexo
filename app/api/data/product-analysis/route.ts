import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contractServices, invoiceServices, quoteServices } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireSession, toNum, dateToStr, apiError } from "@/lib/api-server";

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const type = new URL(request.url).searchParams.get("type") ?? "contract-products";

  try {
    if (type === "invoice-products") {
      const rows = await db.query.invoiceServices.findMany({
        with: { invoice: { columns: { issueDate: true } } },
        orderBy: [desc(invoiceServices.createdAt)],
      });
      return NextResponse.json(rows.map((r) => ({
        id: r.id,
        invoice_id: r.invoiceId,
        service_id: r.serviceId,
        description: r.description ?? "",
        quantity: r.quantity ?? 1,
        unit_price: toNum(r.unitPrice),
        total: toNum(r.total),
        invoice_date: r.invoice?.issueDate ?? null,
      })));
    }

    if (type === "quote-products") {
      const rows = await db.query.quoteServices.findMany({
        with: { quote: { columns: { validUntil: true } } },
        orderBy: [desc(quoteServices.createdAt)],
      });
      return NextResponse.json(rows.map((r) => ({
        id: r.id,
        quote_id: r.quoteId,
        service_id: r.serviceId,
        description: "",
        quantity: r.quantity ?? 1,
        unit_price: toNum(r.unitPrice),
        total: toNum(r.total),
        quote_date: r.quote?.validUntil ?? null,
      })));
    }

    // Default: contract-products
    const rows = await db.query.contractServices.findMany({
      with: {
        contract: {
          columns: { id: true, contractNumber: true, status: true },
          with: { client: { columns: { id: true, name: true } } },
        },
        service: { columns: { id: true, name: true, category: true } },
      },
      orderBy: [desc(contractServices.createdAt)],
    });

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      contract_id: r.contractId,
      service_id: r.serviceId,
      quantity: r.quantity ?? 1,
      unit_price: toNum(r.unitPrice),
      total: toNum(r.total),
      is_active: r.isActive ?? true,
      contract: r.contract ? {
        id: r.contract.id,
        contract_number: r.contract.contractNumber,
        status: r.contract.status,
        client: r.contract.client ? { id: r.contract.client.id, name: r.contract.client.name } : null,
      } : null,
      service: r.service ? { id: r.service.id, name: r.service.name, category: r.service.category } : null,
    })));
  } catch (e) {
    return apiError(String(e));
  }
}
