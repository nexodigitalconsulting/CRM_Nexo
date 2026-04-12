// API layer: contacts — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/contacts";

export interface ContactRow {
  id: string;
  contact_number: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  meeting_date: string | null;
  presentation_url: string | null;
  quote_url: string | null;
  notes: string | null;
  place_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<ContactRow, "id" | "contact_number" | "created_at" | "updated_at">;
export type ContactUpdate = Partial<ContactInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchContacts(): Promise<ContactRow[]> {
  return apiFetch<ContactRow[]>(BASE);
}

export async function fetchContact(id: string): Promise<ContactRow> {
  return apiFetch<ContactRow>(`${BASE}/${id}`);
}

export async function createContact(contact: ContactInsert): Promise<ContactRow> {
  return apiFetch<ContactRow>(BASE, { method: "POST", body: JSON.stringify(contact) });
}

export async function updateContact(id: string, contact: ContactUpdate): Promise<ContactRow> {
  return apiFetch<ContactRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(contact) });
}

export async function deleteContact(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function convertContactToClient(
  contactId: string,
  clientData: Record<string, unknown>,
  userId: string
): Promise<{ clientId: string }> {
  return apiFetch<{ clientId: string }>(`${BASE}/${contactId}/convert`, {
    method: "POST",
    body: JSON.stringify({ clientData, userId }),
  });
}
