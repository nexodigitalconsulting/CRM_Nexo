import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarCategories } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return apiError("userId requerido", 400);
  try {
    const rows = await db.select().from(calendarCategories).where(eq(calendarCategories.userId, userId)).orderBy(asc(calendarCategories.name));
    return NextResponse.json(rows.map(mapCategory));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(calendarCategories).values({
      userId: (body.user_id as string) ?? user.id,
      name: body.name as string,
      color: (body.color as string) ?? "#3b82f6",
      importance: (body.importance as "alta" | "media" | "baja") ?? "media",
      isDefault: (body.is_default as boolean) ?? false,
    }).returning();
    return NextResponse.json(mapCategory(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
