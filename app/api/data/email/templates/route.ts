import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/schema";
import { asc } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
    return NextResponse.json(rows.map(mapTemplate));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(emailTemplates).values({
      name: body.name as string,
      templateType: body.template_type as string,
      subject: body.subject as string,
      bodyHtml: body.body_html as string,
      isActive: (body.is_active as boolean) ?? true,
    }).returning();
    return NextResponse.json(mapTemplate(created), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
