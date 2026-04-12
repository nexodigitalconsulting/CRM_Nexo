import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapProfile(p: typeof profiles.$inferSelect) {
  return {
    id: p.id,
    user_id: p.userId,
    email: p.email,
    full_name: p.fullName,
    phone: p.phone,
    avatar_url: p.avatarUrl,
    language: p.language,
    timezone: p.timezone,
    is_active: p.isActive,
    dashboard_config: p.dashboardConfig ?? null,
    created_at: dateToStr(p.createdAt) ?? "",
    updated_at: dateToStr(p.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  const userId = new URL(request.url).searchParams.get("userId") ?? user.id;
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return NextResponse.json(row ? mapProfile(row) : null);
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const userId = (body.userId as string) ?? user.id;
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (existing) {
      const update: Partial<typeof profiles.$inferInsert> = {};
      if (body.full_name !== undefined) update.fullName = body.full_name as string | null;
      if (body.phone !== undefined) update.phone = body.phone as string | null;
      if (body.avatar_url !== undefined) update.avatarUrl = body.avatar_url as string | null;
      if (body.dashboard_config !== undefined) update.dashboardConfig = body.dashboard_config;
      update.updatedAt = new Date();
      const [updated] = await db.update(profiles).set(update).where(eq(profiles.id, existing.id)).returning();
      return NextResponse.json(mapProfile(updated));
    }
    // Create profile if it doesn't exist
    const [created] = await db.insert(profiles).values({
      userId,
      email: user.email,
      fullName: body.full_name as string | null,
      phone: body.phone as string | null,
    }).returning();
    return NextResponse.json(mapProfile(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
