import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapTemplate(t: typeof documentTemplates.$inferSelect) {
  return {
    id: t.id, name: t.name, entity_type: t.entityType,
    content: t.content, variables: Array.isArray(t.variables) ? t.variables as string[] : null,
    is_default: t.isDefault ?? false, is_active: t.isActive ?? true,
    created_by: t.createdBy, created_at: dateToStr(t.createdAt) ?? "", updated_at: dateToStr(t.updatedAt) ?? "",
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  const action = new URL(request.url).searchParams.get("action");
  try {
    if (action === "set-default") {
      // Get entity type of this template
      const [tpl] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
      if (!tpl) return apiError("No encontrado", 404);
      // Unset all defaults for this entity type
      await db.update(documentTemplates)
        .set({ isDefault: false })
        .where(and(eq(documentTemplates.entityType, tpl.entityType), ne(documentTemplates.id, id)));
      // Set this one as default
      const [updated] = await db.update(documentTemplates).set({ isDefault: true, updatedAt: new Date() })
        .where(eq(documentTemplates.id, id)).returning();
      return NextResponse.json(mapTemplate(updated));
    }

    const body = await request.json() as Record<string, unknown>;

    // If setting as default, unset others first
    if (body.is_default === true) {
      const [tpl] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
      if (tpl) {
        await db.update(documentTemplates)
          .set({ isDefault: false })
          .where(and(eq(documentTemplates.entityType, tpl.entityType), ne(documentTemplates.id, id)));
      }
    }

    const update: Partial<typeof documentTemplates.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.content !== undefined) update.content = body.content as string;
    if (body.variables !== undefined) update.variables = body.variables as unknown[];
    if (body.is_default !== undefined) update.isDefault = body.is_default as boolean;
    if (body.is_active !== undefined) update.isActive = body.is_active as boolean;
    update.updatedAt = new Date();

    const [updated] = await db.update(documentTemplates).set(update)
      .where(eq(documentTemplates.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    return NextResponse.json(mapTemplate(updated));
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
    await db.delete(documentTemplates).where(eq(documentTemplates.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
