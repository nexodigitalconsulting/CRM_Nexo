import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userTableViews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof userTableViews.$inferInsert> = {};
    if (body.view_name !== undefined) update.viewName = body.view_name as string;
    if (body.visible_columns !== undefined) update.visibleColumns = body.visible_columns as string[];
    if (body.column_order !== undefined) update.columnOrder = body.column_order as string[];
    if (body.filters !== undefined) update.filters = body.filters as Record<string, unknown>;
    if (body.sort_config !== undefined) update.sortConfig = body.sort_config as Record<string, unknown>;
    if (body.is_default !== undefined) update.isDefault = body.is_default as boolean;
    update.updatedAt = new Date();
    const [updated] = await db.update(userTableViews).set(update).where(eq(userTableViews.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json({
      id: updated.id, user_id: updated.userId, entity_name: updated.entityName,
      view_name: updated.viewName, visible_columns: updated.visibleColumns ?? [],
      column_order: updated.columnOrder ?? [], filters: updated.filters ?? {},
      sort_config: updated.sortConfig ?? {}, is_default: updated.isDefault ?? false,
      created_at: dateToStr(updated.createdAt) ?? "", updated_at: dateToStr(updated.updatedAt) ?? "",
    });
  } catch (e) {
    return apiError(String(e));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    await db.delete(userTableViews).where(eq(userTableViews.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
