import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userTableViews } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapView(v: typeof userTableViews.$inferSelect) {
  return {
    id: v.id,
    user_id: v.userId,
    entity_name: v.entityName,
    view_name: v.viewName,
    visible_columns: v.visibleColumns ?? [],
    column_order: v.columnOrder ?? [],
    filters: v.filters ?? {},
    sort_config: v.sortConfig ?? {},
    is_default: v.isDefault ?? false,
    created_at: dateToStr(v.createdAt) ?? "",
    updated_at: dateToStr(v.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const entityName = searchParams.get("entityName");
  const defaultOnly = searchParams.get("default") === "true";

  if (!entityName) return apiError("entityName requerido", 400);

  try {
    if (defaultOnly) {
      const [row] = await db.select().from(userTableViews)
        .where(and(eq(userTableViews.entityName, entityName), eq(userTableViews.isDefault, true)))
        .limit(1);
      return NextResponse.json(row ? mapView(row) : null);
    }
    const rows = await db.select().from(userTableViews)
      .where(eq(userTableViews.entityName, entityName))
      .orderBy(desc(userTableViews.isDefault), asc(userTableViews.viewName));
    return NextResponse.json(rows.map(mapView));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(userTableViews).values({
      userId: (body.user_id as string) ?? user.id,
      entityName: body.entity_name as string,
      viewName: body.view_name as string,
      visibleColumns: body.visible_columns as string[],
      columnOrder: (body.column_order as string[]) ?? [],
      filters: (body.filters as Record<string, unknown>) ?? {},
      sortConfig: (body.sort_config as Record<string, unknown>) ?? {},
      isDefault: (body.is_default as boolean) ?? false,
    }).returning();
    return NextResponse.json(mapView(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
