import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

function mapEmailSettings(s: typeof emailSettings.$inferSelect) {
  return {
    id: s.id,
    smtp_host: s.smtpHost,
    smtp_port: s.smtpPort,
    smtp_user: s.smtpUser,
    smtp_password: s.smtpPassword,
    smtp_secure: s.smtpSecure,
    from_email: s.fromEmail,
    from_name: s.fromName,
    signature_html: s.signatureHtml,
    provider: s.provider,
    is_active: s.isActive,
    created_at: dateToStr(s.createdAt) ?? "",
    updated_at: dateToStr(s.updatedAt) ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const rows = await db.select().from(emailSettings).limit(1);
    return NextResponse.json(rows[0] ? mapEmailSettings(rows[0]) : null);
  } catch (e) {
    return apiError(String(e));
  }
}

export async function PUT(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const existing = await db.select().from(emailSettings).limit(1);
    let row;
    if (existing[0]) {
      const update: Partial<typeof emailSettings.$inferInsert> = {};
      if (body.smtp_host !== undefined) update.smtpHost = body.smtp_host as string;
      if (body.smtp_port !== undefined) update.smtpPort = body.smtp_port as number;
      if (body.smtp_user !== undefined) update.smtpUser = body.smtp_user as string;
      if (body.smtp_password !== undefined) update.smtpPassword = body.smtp_password as string;
      if (body.smtp_secure !== undefined) update.smtpSecure = body.smtp_secure as boolean;
      if (body.from_email !== undefined) update.fromEmail = body.from_email as string;
      if (body.from_name !== undefined) update.fromName = body.from_name as string | null;
      if (body.signature_html !== undefined) update.signatureHtml = body.signature_html as string | null;
      if (body.provider !== undefined) update.provider = body.provider as string;
      if (body.is_active !== undefined) update.isActive = body.is_active as boolean;
      update.updatedAt = new Date();
      [row] = await db.update(emailSettings).set(update).where(eq(emailSettings.id, existing[0].id)).returning();
    } else {
      [row] = await db.insert(emailSettings).values({
        smtpHost: body.smtp_host as string,
        smtpPort: body.smtp_port as number,
        smtpUser: body.smtp_user as string,
        smtpPassword: body.smtp_password as string,
        smtpSecure: body.smtp_secure as boolean | undefined,
        fromEmail: body.from_email as string,
        fromName: body.from_name as string | null,
        signatureHtml: body.signature_html as string | null,
        provider: body.provider as string | undefined,
        isActive: body.is_active as boolean | undefined,
      }).returning();
    }
    return NextResponse.json(mapEmailSettings(row));
  } catch (e) {
    return apiError(String(e));
  }
}
