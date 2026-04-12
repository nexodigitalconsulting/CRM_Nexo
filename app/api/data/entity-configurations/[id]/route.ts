import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entityConfigurations } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    await db.delete(entityConfigurations).where(eq(entityConfigurations.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
