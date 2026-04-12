import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { desc, asc, eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError, nextSeq } from "@/lib/api-server";

function mapService(s: typeof services.$inferSelect) {
  return {
    id: s.id,
    service_number: s.serviceNumber,
    name: s.name,
    description: s.description,
    category: s.category,
    price: toNum(s.price),
    iva_percent: toNum(s.ivaPercent),
    status: s.status,
    created_by: s.createdBy,
    created_at: dateToStr(s.createdAt) ?? "",
    updated_at: dateToStr(s.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");
  try {
    let rows;
    if (active === "true") {
      rows = await db.select().from(services).where(eq(services.status, "activo")).orderBy(asc(services.name));
    } else {
      rows = await db.select().from(services).orderBy(desc(services.serviceNumber));
    }
    return NextResponse.json(rows.map(mapService));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const serviceNumber = await nextSeq(services, services.serviceNumber);
    const [created] = await db.insert(services).values({
      serviceNumber,
      name: body.name as string,
      description: body.description as string | null,
      category: body.category as string | null,
      price: String(body.price ?? "0"),
      ivaPercent: body.iva_percent !== undefined ? String(body.iva_percent) : "21.00",
      status: (body.status as "activo" | "inactivo" | "desarrollo") ?? "activo",
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapService(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
