/**
 * PATCH /api/data/users/[id] — update user role (via baMember)
 * DELETE /api/data/users/[id] — remove member (keeps ba_user, removes ba_member row)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baMember, baUser } from "@/lib/schema";
import { requireSession, apiError } from "@/lib/api-server";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  const { id } = await params;
  if (id === user.id) return apiError("No puedes modificar tu propio rol", 400);

  try {
    const body = await request.json() as { role: string };
    // Upsert member row
    const existing = await db.select().from(baMember).where(eq(baMember.userId, id)).limit(1);
    if (existing.length > 0) {
      await db.update(baMember).set({ role: body.role }).where(eq(baMember.userId, id));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(String(e));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  const { id } = await params;
  if (id === user.id) return apiError("No puedes eliminarte a ti mismo", 400);

  try {
    // Remove member association (keeps auth user)
    await db.delete(baMember).where(eq(baMember.userId, id));
    // Also delete the ba_user row to fully remove access
    await db.delete(baUser).where(eq(baUser.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
