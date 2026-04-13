/**
 * DELETE /api/data/users/sessions/[id] — revoke a specific session
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { baSession } from "@/lib/schema";
import { requireSession, apiError } from "@/lib/api-server";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  const { id } = await params;

  try {
    // Only allow revoking own sessions
    await db
      .delete(baSession)
      .where(and(eq(baSession.id, id), eq(baSession.userId, user.id)));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
