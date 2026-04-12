import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireSession(request);
  if (response) return response;
  const { id } = await params;
  try {
    const row = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, id),
      with: { category: true, client: true, contact: true, contract: true },
    });
    if (!row) return apiError("No encontrado", 404);
    return NextResponse.json(mapEvent(row));
  } catch (e) {
    return apiError(String(e));
  }
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
    const update: Partial<typeof calendarEvents.$inferInsert> = {};
    if (body.title !== undefined) update.title = body.title as string;
    if (body.description !== undefined) update.description = body.description as string | null;
    if (body.location !== undefined) update.location = body.location as string | null;
    if (body.start_datetime !== undefined) update.startDatetime = new Date(body.start_datetime as string);
    if (body.end_datetime !== undefined) update.endDatetime = new Date(body.end_datetime as string);
    if (body.all_day !== undefined) update.allDay = body.all_day as boolean;
    if (body.category_id !== undefined) update.categoryId = body.category_id as string | null;
    if (body.importance !== undefined) update.importance = body.importance as "alta" | "media" | "baja";
    if (body.status !== undefined) update.status = body.status as string;
    if (body.notes !== undefined) update.notes = body.notes as string | null;
    if (body.reminder_minutes !== undefined) update.reminderMinutes = body.reminder_minutes as number | null;
    if (body.recurrence_rule !== undefined) update.recurrenceRule = body.recurrence_rule as string | null;
    if (body.client_id !== undefined) update.clientId = body.client_id as string | null;
    if (body.contact_id !== undefined) update.contactId = body.contact_id as string | null;
    if (body.contract_id !== undefined) update.contractId = body.contract_id as string | null;
    if (body.google_event_id !== undefined) update.googleEventId = body.google_event_id as string | null;
    if (body.google_calendar_id !== undefined) update.googleCalendarId = body.google_calendar_id as string | null;
    if (body.is_synced_to_google !== undefined) update.isSyncedToGoogle = body.is_synced_to_google as boolean;
    update.updatedAt = new Date();

    const [updated] = await db.update(calendarEvents).set(update).where(eq(calendarEvents.id, id)).returning();
    if (!updated) return apiError("No encontrado", 404);

    const full = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, id),
      with: { category: true, client: true, contact: true, contract: true },
    });
    return NextResponse.json(mapEvent(full));
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
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return apiError(String(e));
  }
}
