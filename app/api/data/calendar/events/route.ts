import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireSession, dateToStr, apiError } from "@/lib/api-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(e: any) {
  return {
    id: e.id,
    user_id: e.userId,
    title: e.title,
    description: e.description,
    location: e.location,
    start_datetime: dateToStr(e.startDatetime),
    end_datetime: dateToStr(e.endDatetime),
    all_day: e.allDay,
    category_id: e.categoryId,
    importance: e.importance,
    status: e.status,
    notes: e.notes,
    reminder_minutes: e.reminderMinutes,
    recurrence_rule: e.recurrenceRule,
    client_id: e.clientId,
    contact_id: e.contactId,
    contract_id: e.contractId,
    google_event_id: e.googleEventId,
    google_calendar_id: e.googleCalendarId,
    is_synced_to_google: e.isSyncedToGoogle,
    created_at: dateToStr(e.createdAt) ?? "",
    updated_at: dateToStr(e.updatedAt) ?? "",
    category: e.category ?? null,
    client: e.client ? { id: e.client.id, name: e.client.name } : null,
    contact: e.contact ? { id: e.contact.id, name: e.contact.name } : null,
    contract: e.contract ? { id: e.contract.id, name: e.contract.name } : null,
  };
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const singleId = searchParams.get("id");

  if (!userId) return apiError("userId requerido", 400);

  try {
    if (singleId) {
      const row = await db.query.calendarEvents.findFirst({
        where: eq(calendarEvents.id, singleId),
        with: { category: true, client: true, contact: true, contract: true },
      });
      if (!row) return apiError("No encontrado", 404);
      return NextResponse.json(mapEvent(row));
    }

    const conditions = [eq(calendarEvents.userId, userId)];
    if (start) conditions.push(gte(calendarEvents.startDatetime, new Date(start)));
    if (end) conditions.push(lte(calendarEvents.endDatetime, new Date(end)));

    const rows = await db.query.calendarEvents.findMany({
      where: and(...conditions),
      with: { category: true, client: true, contact: true, contract: true },
    });
    return NextResponse.json(rows.map(mapEvent));
  } catch (e) {
    return apiError(String(e));
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const [created] = await db.insert(calendarEvents).values({
      userId: (body.user_id as string) ?? user.id,
      title: body.title as string,
      description: body.description as string | null,
      location: body.location as string | null,
      startDatetime: new Date(body.start_datetime as string),
      endDatetime: new Date(body.end_datetime as string),
      allDay: (body.all_day as boolean) ?? false,
      categoryId: body.category_id as string | null,
      importance: (body.importance as "alta" | "media" | "baja") ?? "media",
      status: (body.status as string) ?? "confirmed",
      notes: body.notes as string | null,
      reminderMinutes: body.reminder_minutes as number | null,
      recurrenceRule: body.recurrence_rule as string | null,
      clientId: body.client_id as string | null,
      contactId: body.contact_id as string | null,
      contractId: body.contract_id as string | null,
      googleEventId: body.google_event_id as string | null,
      googleCalendarId: body.google_calendar_id as string | null,
      isSyncedToGoogle: (body.is_synced_to_google as boolean) ?? false,
    }).returning();

    const full = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, created.id),
      with: { category: true, client: true, contact: true, contract: true },
    });
    return NextResponse.json(mapEvent(full), { status: 201 });
  } catch (e) {
    return apiError(String(e));
  }
}
