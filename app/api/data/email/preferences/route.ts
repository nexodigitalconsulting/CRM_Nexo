import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientNotificationPreferences } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapPref(p: typeof clientNotificationPreferences.$inferSelect) {
  return {
    id: p.id,
    client_id: p.clientId,
    rule_type: p.ruleType,
    is_enabled: p.isEnabled,
    created_at: dateToStr(p.createdAt) ?? "",
    updated_at: dateToStr(p.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId) return apiError("clientId requerido", 400);
  try {
    const rows = await db.select().from(clientNotificationPreferences)
      .where(eq(clientNotificationPreferences.clientId, clientId));
    return NextResponse.json(rows.map(mapPref));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as { clientId: string; ruleType: string; isEnabled: boolean };
    // Check if exists
    const [existing] = await db.select().from(clientNotificationPreferences)
      .where(and(
        eq(clientNotificationPreferences.clientId, body.clientId),
        eq(clientNotificationPreferences.ruleType, body.ruleType)
      ));
    if (existing) {
      const [updated] = await db.update(clientNotificationPreferences)
        .set({ isEnabled: body.isEnabled, updatedAt: new Date() })
        .where(eq(clientNotificationPreferences.id, existing.id))
        .returning();
      return NextResponse.json(mapPref(updated));
    }
    const [created] = await db.insert(clientNotificationPreferences).values({
      clientId: body.clientId,
      ruleType: body.ruleType,
      isEnabled: body.isEnabled,
    }).returning();
    return NextResponse.json(mapPref(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
