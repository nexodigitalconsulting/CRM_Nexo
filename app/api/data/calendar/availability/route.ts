import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userAvailability } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapAvailability(a: typeof userAvailability.$inferSelect) {
  return {
    id: a.id,
    user_id: a.userId,
    day_of_week: a.dayOfWeek,
    start_time: a.startTime,
    end_time: a.endTime,
    is_available: a.isAvailable,
    created_at: dateToStr(a.createdAt) ?? "",
    updated_at: dateToStr(a.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return apiError("userId requerido", 400);
  try {
    const rows = await db.select().from(userAvailability).where(eq(userAvailability.userId, userId)).orderBy(asc(userAvailability.dayOfWeek));
    return NextResponse.json(rows.map(mapAvailability));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Array<{
      user_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }>;

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json([]);
    }

    const userId = body[0].user_id;
    // Delete all existing availability for this user
    await db.delete(userAvailability).where(eq(userAvailability.userId, userId));

    // Insert new ones
    const inserted = await db.insert(userAvailability).values(
      body.map((a) => ({
        userId: a.user_id,
        dayOfWeek: a.day_of_week,
        startTime: a.start_time,
        endTime: a.end_time,
        isAvailable: a.is_available ?? true,
      }))
    ).returning();

    return NextResponse.json(inserted.map(mapAvailability), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
