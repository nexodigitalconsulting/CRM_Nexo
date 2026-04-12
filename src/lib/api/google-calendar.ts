// API layer: google-calendar — Next.js API routes (OAuth placeholder)
const BASE = "/api/data/google-calendar";

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
}

export interface GoogleCalendarResponse {
  connected: boolean;
  events: GoogleCalendarEvent[];
  needsReauth?: boolean;
  error?: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchGoogleCalendarEvents(
  _accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarResponse> {
  try {
    const params = new URLSearchParams({ action: "events" });
    if (timeMin) params.set("timeMin", timeMin);
    if (timeMax) params.set("timeMax", timeMax);
    return apiFetch<GoogleCalendarResponse>(`${BASE}?${params}`);
  } catch {
    return { connected: false, events: [] };
  }
}

export async function getGoogleCalendarAuthUrl(_accessToken: string): Promise<string> {
  const data = await apiFetch<{ authUrl?: string }>(`${BASE}?action=auth`, { method: "POST" });
  if (!data.authUrl) throw new Error("No se pudo obtener URL de autenticación");
  return data.authUrl;
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await fetch(`${BASE}?userId=${userId}`, { method: "DELETE" });
}
