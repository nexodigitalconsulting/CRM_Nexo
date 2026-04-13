/**
 * Public webcal feed endpoint — no session auth, secured by per-user token.
 *
 * Usage:
 *   GET /api/calendar/feed?token=<calendarFeedToken>
 *
 * Add to Google Calendar:
 *   webcal://<host>/api/calendar/feed?token=<token>
 *
 * Google polls this URL every 6-24h automatically.
 * Returns a VCALENDAR with all events for the token's owner.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, calendarEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateICS } from "@/lib/ics";

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function fold(line: string): string {
  const LIMIT = 75;
  if (line.length <= LIMIT) return line;
  const chunks: string[] = [];
  let pos = 0;
  while (pos < line.length) {
    if (pos === 0) {
      chunks.push(line.slice(0, LIMIT));
      pos = LIMIT;
    } else {
      chunks.push(" " + line.slice(pos, pos + LIMIT - 1));
      pos += LIMIT - 1;
    }
  }
  return chunks.join("\r\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDateOnly(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token || token.length < 32) {
    return new NextResponse("Token inválido", { status: 401 });
  }

  // Lookup profile by token
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.calendarFeedToken, token))
    .limit(1);

  if (!profile) {
    return new NextResponse("Token no encontrado", { status: 404 });
  }

  // Fetch all events for this user
  const events = await db.query.calendarEvents.findMany({
    where: eq(calendarEvents.userId, profile.userId),
    with: { category: true, client: true, contact: true, contract: true },
  });

  const now = icsDate(new Date());
  const prodId = "-//Nexo Digital CRM//ES";

  // Build VCALENDAR manually (full feed, not single-event METHOD)
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:CRM Nexo — ${profile.fullName ?? profile.email}`),
    "X-WR-TIMEZONE:Europe/Madrid",
    "X-WR-CALDESC:Eventos del CRM Nexo",
  ];

  for (const event of events) {
    const uid = `${event.id}@crm-nexo`;
    const seq = 0;

    // Build description combining notes + linked entities
    const descParts: string[] = [];
    if (event.description) descParts.push(event.description);
    if (event.notes) descParts.push(`Notas: ${event.notes}`);
    if ((event as any).client?.name) descParts.push(`Cliente: ${(event as any).client.name}`);
    if ((event as any).contract?.name) descParts.push(`Contrato: ${(event as any).contract.name}`);
    const description = descParts.join("\\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`SEQUENCE:${seq}`);
    lines.push(`STATUS:CONFIRMED`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDateOnly(event.startDatetime)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDateOnly(event.endDatetime)}`);
    } else {
      lines.push(`DTSTART:${icsDate(event.startDatetime)}`);
      lines.push(`DTEND:${icsDate(event.endDatetime)}`);
    }

    lines.push(fold(`SUMMARY:${escapeText(event.title)}`));
    if (description) lines.push(fold(`DESCRIPTION:${description}`));
    if (event.location) lines.push(fold(`LOCATION:${escapeText(event.location)}`));

    // Category → COLOR hint (non-standard but supported by some clients)
    if ((event as any).category?.color) {
      lines.push(`COLOR:${(event as any).category.color}`);
    }

    // Reminder
    if (event.reminderMinutes && event.reminderMinutes > 0) {
      lines.push("BEGIN:VALARM");
      lines.push("TRIGGER:-PT" + event.reminderMinutes + "M");
      lines.push("ACTION:DISPLAY");
      lines.push(fold(`DESCRIPTION:Recordatorio: ${escapeText(event.title)}`));
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const icsContent = lines.join("\r\n") + "\r\n";

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm-nexo.ics"`,
      // No-cache so Google always gets fresh data when it polls
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
