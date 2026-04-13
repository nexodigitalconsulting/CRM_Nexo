/**
 * GET  — returns current calendarFeedToken (generates one if missing)
 * POST — rotates (regenerates) the token
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";
function generateToken(): string {
  // Web Crypto API — available in Next.js Edge/Node runtimes
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrCreateToken(userId: string): Promise<string> {
  const [profile] = await db
    .select({ id: profiles.id, token: profiles.calendarFeedToken })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile) throw new Error("Perfil no encontrado");

  if (profile.token) return profile.token;

  // Generate and save
  const token = generateToken();
  await db.update(profiles).set({ calendarFeedToken: token }).where(eq(profiles.id, profile.id));
  return token;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const token = await getOrCreateToken(user.id);
    return NextResponse.json({ token });
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    // Rotate: generate a new token regardless
    const token = generateToken();
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!profile) return apiError("Perfil no encontrado", 404);

    await db.update(profiles).set({ calendarFeedToken: token }).where(eq(profiles.id, profile.id));
    return NextResponse.json({ token });
  } catch (e) {
    return apiError(String(e));
  }
}
