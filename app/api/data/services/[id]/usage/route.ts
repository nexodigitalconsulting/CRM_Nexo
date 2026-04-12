import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoiceServices, quoteServices, contractServices } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const [invResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(invoiceServices)
      .where(eq(invoiceServices.serviceId, id));

    const [quoteResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(quoteServices)
      .where(eq(quoteServices.serviceId, id));

    const [contractResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(contractServices)
      .where(eq(contractServices.serviceId, id));

    return NextResponse.json({
      invoiceCount: invResult?.count ?? 0,
      quoteCount: quoteResult?.count ?? 0,
      contractCount: contractResult?.count ?? 0,
    });
  } catch (e) {
    return apiError(String(e));
  }
}
