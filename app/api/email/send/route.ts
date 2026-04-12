import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSettings, emailLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireSession, apiError } from "@/lib/api-server";

export interface SendEmailPayload {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  entityType?: string;
  entityId?: string;
  attachPdf?: boolean;
  pdfBase64?: string;
  pdfFilename?: string;
  attachments?: Array<{ filename: string; content: string; encoding: string }>;
  test?: boolean;
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;

  try {
    const payload = await request.json() as SendEmailPayload;

    // Fetch email settings
    const [settings] = await db.select().from(emailSettings).limit(1);

    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: "Email no configurado o inactivo" }, { status: 400 });
    }

    // Attempt to send via nodemailer
    let nodemailer: typeof import("nodemailer") | null = null;
    try {
      nodemailer = (await import("nodemailer")) as typeof import("nodemailer");
    } catch {
      return NextResponse.json({ error: "nodemailer no instalado. Ejecuta: npm install nodemailer" }, { status: 501 });
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: settings.smtpSecure ?? true,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });

    const attachments: Array<{ filename: string; content: string; encoding: string }> = [];

    if (payload.pdfBase64 && payload.pdfFilename) {
      attachments.push({
        filename: payload.pdfFilename,
        content: payload.pdfBase64,
        encoding: "base64",
      });
    }

    if (payload.attachments?.length) {
      attachments.push(...payload.attachments);
    }

    const mailOptions = {
      from: `${settings.fromName ?? ""} <${settings.fromEmail}>`,
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      html: payload.html + (settings.signatureHtml ? `\n${settings.signatureHtml}` : ""),
      attachments: attachments.length ? attachments : undefined,
    };

    if (payload.test) {
      await transporter.verify();
      return NextResponse.json({ success: true, message: "Conexión SMTP verificada" });
    }

    await transporter.sendMail(mailOptions);

    // Log the email
    await db.insert(emailLogs).values({
      userId: user.id,
      senderEmail: settings.fromEmail,
      senderName: settings.fromName,
      recipientEmail: payload.to,
      subject: payload.subject,
      bodyPreview: payload.html.replace(/<[^>]*>/g, "").substring(0, 200),
      attachmentCount: attachments.length,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      provider: settings.provider ?? "smtp",
      status: "sent",
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const errMsg = String(e);
    // Log failed attempt if possible
    try {
      const [settings] = await db.select().from(emailSettings).limit(1);
      if (settings) {
        await db.insert(emailLogs).values({
          userId: user.id,
          senderEmail: settings.fromEmail,
          senderName: settings.fromName,
          recipientEmail: "unknown",
          subject: "Error",
          provider: settings.provider ?? "smtp",
          status: "error",
          errorMessage: errMsg.substring(0, 500),
        });
      }
    } catch { /* ignore logging errors */ }
    return apiError(errMsg);
  }
}
