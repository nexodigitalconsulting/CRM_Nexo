/**
 * Mailer helpers — server-side only (Node.js runtime)
 * Reuses emailSettings from DB (same SMTP config as /api/email/send)
 */

import { db } from "@/lib/db";
import { emailSettings } from "@/lib/schema";

interface Attachment {
  filename: string;
  content: string;        // raw string content (not base64 unless encoding says so)
  contentType?: string;
  encoding?: string;
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

async function getTransporter() {
  const nodemailer = (await import("nodemailer")) as typeof import("nodemailer");
  const [settings] = await db.select().from(emailSettings).limit(1);
  if (!settings || !settings.isActive) return null;

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort ?? 587,
    secure: settings.smtpSecure ?? true,
    auth: { user: settings.smtpUser, pass: settings.smtpPassword },
  });

  return { transporter, settings };
}

export async function sendMail(opts: SendMailOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await getTransporter();
    if (!result) return { ok: false, error: "Email no configurado" };
    const { transporter, settings } = result;

    await transporter.sendMail({
      from: `${settings.fromName ?? ""} <${settings.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        encoding: a.encoding,
      })),
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Send an ICS file to the user's email so Google Calendar can import it.
 * @param to      Recipient email
 * @param title   Event title (used in email subject)
 * @param icsContent  .ics file content (string)
 * @param method  "REQUEST" = create/update, "CANCEL" = delete
 */
export async function sendICSEmail(
  to: string,
  title: string,
  icsContent: string,
  method: "REQUEST" | "CANCEL"
): Promise<{ ok: boolean; error?: string }> {
  const isCancel = method === "CANCEL";
  const subject = isCancel
    ? `[CRM] Evento cancelado: ${title}`
    : `[CRM] Añade a Google Calendar: ${title}`;

  const html = isCancel
    ? `<p>El evento <strong>${title}</strong> ha sido cancelado en el CRM.</p>
       <p>Abre el archivo adjunto (.ics) para actualizar tu Google Calendar.</p>`
    : `<p>Se ha ${method === "REQUEST" ? "creado o actualizado" : "cancelado"} el evento <strong>${title}</strong> en el CRM.</p>
       <p>Abre el archivo adjunto (.ics) para añadirlo o actualizarlo en Google Calendar.</p>`;

  return sendMail({
    to,
    subject,
    html,
    attachments: [
      {
        filename: "evento.ics",
        content: icsContent,
        contentType: "text/calendar; method=" + method,
      },
    ],
  });
}
