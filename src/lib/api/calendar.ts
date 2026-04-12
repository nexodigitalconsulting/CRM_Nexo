// API layer: calendar — Drizzle/PostgreSQL via Next.js API routes
const BASE_EVENTS = "/api/data/calendar/events";
const BASE_CATS = "/api/data/calendar/categories";
const BASE_AVAIL = "/api/data/calendar/availability";

export interface CalendarCategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  importance: "alta" | "media" | "baja" | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  category_id: string | null;
  importance: "alta" | "media" | "baja" | null;
  status: string;
  notes: string | null;
  reminder_minutes: number | null;
  recurrence_rule: string | null;
  client_id: string | null;
  contact_id: string | null;
  contract_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  is_synced_to_google: boolean;
  created_at: string;
  updated_at: string;
  category?: CalendarCategoryRow | null;
  client?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
  contract?: { id: string; name: string | null } | null;
}

export interface UserAvailabilityRow {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type CalendarEventInsert = Omit<CalendarEventRow, "id" | "created_at" | "updated_at" | "category" | "client" | "contact" | "contract">;
export type CalendarCategoryInsert = Omit<CalendarCategoryRow, "id" | "created_at" | "updated_at">;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchCalendarEvents(userId: string, start?: string, end?: string): Promise<CalendarEventRow[]> {
  const params = new URLSearchParams({ userId });
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return apiFetch<CalendarEventRow[]>(`${BASE_EVENTS}?${params}`);
}

export async function fetchCalendarEvent(id: string): Promise<CalendarEventRow> {
  return apiFetch<CalendarEventRow>(`${BASE_EVENTS}/${id}`);
}

export async function createCalendarEvent(event: CalendarEventInsert): Promise<CalendarEventRow> {
  return apiFetch<CalendarEventRow>(BASE_EVENTS, { method: "POST", body: JSON.stringify(event) });
}

export async function updateCalendarEvent(id: string, event: Partial<CalendarEventInsert>): Promise<CalendarEventRow> {
  return apiFetch<CalendarEventRow>(`${BASE_EVENTS}/${id}`, { method: "PUT", body: JSON.stringify(event) });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await fetch(`${BASE_EVENTS}/${id}`, { method: "DELETE" });
}

// Categories
export async function fetchCalendarCategories(userId: string): Promise<CalendarCategoryRow[]> {
  return apiFetch<CalendarCategoryRow[]>(`${BASE_CATS}?userId=${userId}`);
}

export async function createCalendarCategory(category: CalendarCategoryInsert): Promise<CalendarCategoryRow> {
  return apiFetch<CalendarCategoryRow>(BASE_CATS, { method: "POST", body: JSON.stringify(category) });
}

export async function updateCalendarCategory(id: string, category: Partial<CalendarCategoryInsert>): Promise<CalendarCategoryRow> {
  return apiFetch<CalendarCategoryRow>(`${BASE_CATS}/${id}`, { method: "PUT", body: JSON.stringify(category) });
}

export async function deleteCalendarCategory(id: string): Promise<void> {
  await fetch(`${BASE_CATS}/${id}`, { method: "DELETE" });
}

// User availability
export async function fetchUserAvailability(userId: string): Promise<UserAvailabilityRow[]> {
  return apiFetch<UserAvailabilityRow[]>(`${BASE_AVAIL}?userId=${userId}`);
}

export async function upsertUserAvailability(
  userId: string,
  availability: Array<Omit<UserAvailabilityRow, "id" | "created_at" | "updated_at">>
): Promise<UserAvailabilityRow[]> {
  return apiFetch<UserAvailabilityRow[]>(BASE_AVAIL, { method: "POST", body: JSON.stringify({ userId, availability }) });
}
