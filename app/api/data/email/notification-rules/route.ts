import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificationRules } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRule(r: any) {
  return {
    id: r.id,
    name: r.name,
    rule_type: r.ruleType,
    description: r.description,
    days_threshold: r.daysThreshold,
    is_active: r.isActive,
    template_id: r.templateId,
    created_at: dateToStr(r.createdAt) ?? "",
    updated_at: dateToStr(r.updatedAt) ?? "",
    template: r.template ?? null,
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.query.notificationRules.findMany({
      with: { template: true },
      orderBy: [asc(notificationRules.name)],
    });
    return NextResponse.json(rows.map(mapRule));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;

    // Upsert: if body has id, update; else insert
    if (body.id) {
      const update: Partial<typeof notificationRules.$inferInsert> = {};
      if (body.name !== undefined) update.name = body.name as string;
      if (body.rule_type !== undefined) update.ruleType = body.rule_type as string;
      if (body.description !== undefined) update.description = body.description as string | null;
      if (body.days_threshold !== undefined) update.daysThreshold = body.days_threshold as number;
      if (body.is_active !== undefined) update.isActive = body.is_active as boolean;
      if (body.template_id !== undefined) update.templateId = body.template_id as string | null;
      update.updatedAt = new Date();
      const [updated] = await db.update(notificationRules).set(update).where(eq(notificationRules.id, body.id as string)).returning();
      const full = await db.query.notificationRules.findFirst({ where: eq(notificationRules.id, updated.id), with: { template: true } });
      return NextResponse.json(mapRule(full));
    }

    const [created] = await db.insert(notificationRules).values({
      name: body.name as string,
      ruleType: body.rule_type as string,
      description: body.description as string | null,
      daysThreshold: (body.days_threshold as number) ?? 3,
      isActive: (body.is_active as boolean) ?? true,
      templateId: body.template_id as string | null,
    }).returning();
    const full = await db.query.notificationRules.findFirst({ where: eq(notificationRules.id, created.id), with: { template: true } });
    return NextResponse.json(mapRule(full), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
