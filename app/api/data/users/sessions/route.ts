/**
 * GET /api/data/users/sessions — list active sessions for current user
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baSession } from "@/lib/schema";
import { requireSession, apiError } from "@/lib/api-server";
import { eq, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  try {
    const sessions = await db
      .select()
      .from(baSession)
      .where(eq(baSession.userId, user.id));

    const now = new Date();
    const active = sessions
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt?.toISOString() ?? "",
        expiresAt: s.expiresAt.toISOString(),
      }));

    return NextResponse.json(active);
  } catch (e) {
    return apiError(String(e));
  }
}
