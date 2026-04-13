/**
 * GET  /api/data/users — list all users (admin only)
 * POST /api/data/users/invite is handled separately
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baUser, baMember } from "@/lib/schema";
import { requireSession, apiError } from "@/lib/api-server";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  try {
    const users = await db.select().from(baUser);
    const members = await db.select().from(baMember);

    const memberMap = new Map(members.map((m) => [m.userId, m]));

    const rows = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      role: memberMap.get(u.id)?.role ?? "user",
      memberId: memberMap.get(u.id)?.id ?? null,
      createdAt: u.createdAt?.toISOString() ?? "",
      isSelf: u.id === user.id,
    }));

    return NextResponse.json(rows);
  } catch (e) {
    return apiError(String(e));
  }
}
