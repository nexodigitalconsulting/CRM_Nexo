import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { googleCalendarConfig } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const action = new URL(request.url).searchParams.get("action");

  // Google Calendar event fetching requires OAuth tokens — placeholder
  if (action === "events") {
    return NextResponse.json({ connected: false, events: [] });
  }

  // Return google calendar config for userId
  const userId = new URL(request.url).searchParams.get("userId");
  if (userId) {
    const [config] = await db.select().from(googleCalendarConfig)
      .where(eq(googleCalendarConfig.userId, userId)).limit(1);
    if (!config) return NextResponse.json(null);
    return NextResponse.json({
      id: config.id,
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
      token_expiry: dateToStr(config.tokenExpiry),
      calendar_id: config.calendarId,
      sync_enabled: config.syncEnabled,
      sync_direction: config.syncDirection,
      last_sync_at: dateToStr(config.lastSyncAt),
    });
  }

  return NextResponse.json(null);
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const action = new URL(request.url).searchParams.get("action");
  // Google OAuth flow — placeholder, requires external setup
  if (action === "auth") {
    return NextResponse.json({ authUrl: "" });
  }
  return apiError("Acción no válida", 400);
}

export async function DELETE(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return apiError("userId requerido", 400);
  try {
    await db.delete(googleCalendarConfig).where(eq(googleCalendarConfig.userId, userId));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
