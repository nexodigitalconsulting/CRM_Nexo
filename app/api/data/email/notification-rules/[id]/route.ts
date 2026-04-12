import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationRules } from "@/lib/schema";
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
    const update: Partial<typeof notificationRules.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.rule_type !== undefined) update.ruleType = body.rule_type as string;
    if (body.description !== undefined) update.description = body.description as string | null;
    if (body.days_threshold !== undefined) update.daysThreshold = body.days_threshold as number;
    if (body.is_active !== undefined) update.isActive = body.is_active as boolean;
    if (body.template_id !== undefined) update.templateId = body.template_id as string | null;
    update.updatedAt = new Date();
    const [updated] = await db.update(notificationRules).set(update).where(eq(notificationRules.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);
    const full = await db.query.notificationRules.findFirst({ where: eq(notificationRules.id, id), with: { template: true } });
    return NextResponse.json({
      id: full!.id, name: full!.name, rule_type: full!.ruleType,
      description: full!.description, days_threshold: full!.daysThreshold,
      is_active: full!.isActive, template_id: full!.templateId,
      created_at: dateToStr(full!.createdAt) ?? "", updated_at: dateToStr(full!.updatedAt) ?? "",
      template: full!.template ?? null,
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
    await db.delete(notificationRules).where(eq(notificationRules.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
