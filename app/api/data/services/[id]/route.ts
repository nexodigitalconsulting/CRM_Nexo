import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, toNum, apiError } from "@/lib/api-server";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const [row] = await db.select().from(services).where(eq(services.id, id));
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapService(row));
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
    const update: Partial<typeof services.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.description !== undefined) update.description = body.description as string | null;
    if (body.category !== undefined) update.category = body.category as string | null;
    if (body.price !== undefined) update.price = String(body.price);
    if (body.iva_percent !== undefined) update.ivaPercent = String(body.iva_percent);
    if (body.status !== undefined) update.status = body.status as "activo" | "inactivo" | "desarrollo";
    update.updatedAt = new Date();
    const [updated] = await db.update(services).set(update).where(eq(services.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapService(updated));
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
    await db.delete(services).where(eq(services.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
