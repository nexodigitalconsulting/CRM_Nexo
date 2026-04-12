import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarCategories } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapCategory(c: typeof calendarCategories.$inferSelect) {
  return {
    id: c.id,
    user_id: c.userId,
    name: c.name,
    color: c.color,
    importance: c.importance,
    is_default: c.isDefault,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
  };
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
    const update: Partial<typeof calendarCategories.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.color !== undefined) update.color = body.color as string;
    if (body.importance !== undefined) update.importance = body.importance as "alta" | "media" | "baja";
    if (body.is_default !== undefined) update.isDefault = body.is_default as boolean;
    update.updatedAt = new Date();
    const [updated] = await db.update(calendarCategories).set(update).where(eq(calendarCategories.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapCategory(updated));
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
    await db.delete(calendarCategories).where(eq(calendarCategories.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
