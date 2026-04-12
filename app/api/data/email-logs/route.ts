import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailLogs, gmailConfig } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const type = new URL(request.url).searchParams.get("type");

  try {
    if (type === "gmail-config") {
      const [config] = await db.select().from(gmailConfig).limit(1);
      if (!config) return NextResponse.json(null);
      return NextResponse.json({
        id: config.id,
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
        token_expiry: dateToStr(config.tokenExpiry),
        email_address: config.emailAddress,
        is_active: config.isActive,
        created_at: dateToStr(config.createdAt) ?? "",
        updated_at: dateToStr(config.updatedAt) ?? "",
      });
    }

    const rows = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      sender_email: r.senderEmail,
      sender_name: r.senderName,
      recipient_email: r.recipientEmail,
      recipient_name: r.recipientName,
      subject: r.subject,
      body_preview: r.bodyPreview,
      attachments: r.attachments ?? [],
      attachment_count: r.attachmentCount ?? 0,
      entity_type: r.entityType,
      entity_id: r.entityId,
      provider: r.provider,
      status: r.status,
      error_message: r.errorMessage,
      sent_at: dateToStr(r.sentAt) ?? "",
      created_at: dateToStr(r.createdAt) ?? "",
    })));
  } catch (e) {
    return apiError(String(e));
  }
}
