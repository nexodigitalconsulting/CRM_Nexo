import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entityConfigurations } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapConfig(c: typeof entityConfigurations.$inferSelect) {
  return {
    id: c.id,
    entity_name: c.entityName,
    display_name: c.displayName,
    icon: c.icon,
    fields: c.fields ?? [],
    is_system: c.isSystem ?? false,
    is_active: c.isActive ?? true,
    created_by: c.createdBy,
    created_at: dateToStr(c.createdAt) ?? "",
    updated_at: dateToStr(c.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const entityName = new URL(request.url).searchParams.get("entityName");
  try {
    if (entityName) {
      const [row] = await db.select().from(entityConfigurations)
        .where(eq(entityConfigurations.entityName, entityName)).limit(1);
      return NextResponse.json(row ? mapConfig(row) : null);
    }
    const rows = await db.select().from(entityConfigurations).orderBy(asc(entityConfigurations.entityName));
    return NextResponse.json(rows.map(mapConfig));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const entityName = body.entity_name as string;
    // Upsert by entityName
    const [existing] = await db.select().from(entityConfigurations)
      .where(eq(entityConfigurations.entityName, entityName)).limit(1);
    if (existing) {
      const [updated] = await db.update(entityConfigurations).set({
        displayName: (body.display_name as string) ?? existing.displayName,
        icon: (body.icon as string | null) ?? existing.icon,
        fields: (body.fields as unknown[]) ?? existing.fields,
        isSystem: (body.is_system as boolean) ?? existing.isSystem,
        isActive: (body.is_active as boolean) ?? existing.isActive,
        updatedAt: new Date(),
      }).where(eq(entityConfigurations.id, existing.id)).returning();
      return NextResponse.json(mapConfig(updated));
    }
    const [created] = await db.insert(entityConfigurations).values({
      entityName,
      displayName: body.display_name as string,
      icon: body.icon as string | null,
      fields: (body.fields as unknown[]) ?? [],
      isSystem: (body.is_system as boolean) ?? false,
      isActive: (body.is_active as boolean) ?? true,
      createdBy: user.id,
    }).returning();
    return NextResponse.json(mapConfig(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
