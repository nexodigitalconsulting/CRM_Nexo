import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapTemplate(t: typeof emailTemplates.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    template_type: t.templateType,
    subject: t.subject,
    body_html: t.bodyHtml,
    is_active: t.isActive,
    created_at: dateToStr(t.createdAt) ?? "",
    updated_at: dateToStr(t.updatedAt) ?? "",
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof emailTemplates.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name as string;
    if (body.template_type !== undefined) update.templateType = body.template_type as string;
    if (body.subject !== undefined) update.subject = body.subject as string;
    if (body.body_html !== undefined) update.bodyHtml = body.body_html as string;
    if (body.is_active !== undefined) update.isActive = body.is_active as boolean;
    update.updatedAt = new Date();
    const [updated] = await db.update(emailTemplates).set(update).where(eq(emailTemplates.id, id)).returning();
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
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
