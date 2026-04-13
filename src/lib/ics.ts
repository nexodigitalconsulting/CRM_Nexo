/**
 * ICS (iCalendar) generator — RFC 5545
 *
 * Generates a VCALENDAR string for a single event.
 * METHOD:REQUEST  → create or update (Google Calendar shows "Add to calendar")
 * METHOD:CANCEL   → delete          (Google Calendar marks the event as cancelled)
 *
 * UID strategy: `${eventId}@crm-nexo` — stable across create/update/delete
 * so Google Calendar reconciles the same event on each change.
 */

export interface ICSEventInput {
  id: string;           // CRM event UUID
  title: string;
  description?: string | null;
  location?: string | null;
  startDatetime: Date;
  endDatetime: Date;
  allDay?: boolean;
  organizerEmail: string;   // SMTP_FROM / fromEmail
  organizerName?: string;
  attendeeEmail: string;    // user email
  sequence?: number;        // increment on each update
}

/** Format a Date as iCalendar datetime: 20260412T143000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Format a Date as iCalendar date-only: 20260412 */
function icsDateOnly(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

/** Fold long lines at 75 octets (RFC 5545 §3.1) */
function fold(line: string): string {
  const LIMIT = 75;
  if (line.length <= LIMIT) return line;
  const chunks: string[] = [];
  let pos = 0;
  // First line: 75 chars; continuations: 74 chars (1 for the space)
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

/** Escape text values per RFC 5545 §3.3.11 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICS(
  event: ICSEventInput,
  method: "REQUEST" | "CANCEL"
): string {
  const uid = `${event.id}@crm-nexo`;
  const now = icsDate(new Date());
  const sequence = event.sequence ?? 0;
  const status = method === "CANCEL" ? "CANCELLED" : "CONFIRMED";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexo Digital CRM//ES",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SEQUENCE:${sequence}`,
    `STATUS:${status}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${icsDateOnly(event.startDatetime)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDateOnly(event.endDatetime)}`);
  } else {
    lines.push(`DTSTART:${icsDate(event.startDatetime)}`);
    lines.push(`DTEND:${icsDate(event.endDatetime)}`);
  }

  lines.push(fold(`SUMMARY:${escapeText(event.title)}`));

  if (event.description) {
    lines.push(fold(`DESCRIPTION:${escapeText(event.description)}`));
  }
  if (event.location) {
    lines.push(fold(`LOCATION:${escapeText(event.location)}`));
  }

  const orgName = event.organizerName ? `CN=${escapeText(event.organizerName)}:` : "";
  lines.push(fold(`ORGANIZER;${orgName}MAILTO:${event.organizerEmail}`));
  lines.push(fold(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;MAILTO:${event.attendeeEmail}`));

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
