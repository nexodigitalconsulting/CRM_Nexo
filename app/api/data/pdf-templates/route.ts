import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapTemplate(t: typeof documentTemplates.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    entity_type: t.entityType as "invoice" | "contract" | "quote",
    content: t.content,
    variables: Array.isArray(t.variables) ? t.variables as string[] : null,
    is_default: t.isDefault ?? false,
    is_active: t.isActive ?? true,
    created_by: t.createdBy,
    created_at: dateToStr(t.createdAt) ?? "",
    updated_at: dateToStr(t.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as "invoice" | "contract" | "quote" | null;
  const defaultOnly = searchParams.get("default") === "true";

  try {
    if (defaultOnly && entityType) {
      // Try to find default first, fallback to first active
      const [defaultTpl] = await db.select().from(documentTemplates)
        .where(and(
          eq(documentTemplates.entityType, entityType),
          eq(documentTemplates.isDefault, true),
          eq(documentTemplates.isActive, true)
        ))
        .orderBy(desc(documentTemplates.updatedAt))
        .limit(1);
      if (defaultTpl) return NextResponse.json(mapTemplate(defaultTpl));

      const [firstActive] = await db.select().from(documentTemplates)
        .where(and(eq(documentTemplates.entityType, entityType), eq(documentTemplates.isActive, true)))
        .orderBy(desc(documentTemplates.updatedAt))
        .limit(1);
      return NextResponse.json(firstActive ? mapTemplate(firstActive) : null);
    }

    let rows;
    if (entityType) {
      rows = await db.select().from(documentTemplates)
        .where(eq(documentTemplates.entityType, entityType))
        .orderBy(desc(documentTemplates.isDefault), asc(documentTemplates.name));
    } else {
      rows = await db.select().from(documentTemplates)
        .orderBy(desc(documentTemplates.isDefault), asc(documentTemplates.name));
    }
    return NextResponse.json(rows.map(mapTemplate));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(documentTemplates).values({
      name: body.name as string,
      entityType: body.entity_type as string,
      content: body.content as string,
      variables: (body.variables as unknown[]) ?? [],
      isDefault: (body.is_default as boolean) ?? false,
      isActive: (body.is_active as boolean) ?? true,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapTemplate(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
