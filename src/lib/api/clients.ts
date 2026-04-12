// API layer: clients — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/clients";

export interface ClientRow {
  id: string;
  client_number: number;
  name: string;
  cif: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  iban: string | null;
  bic: string | null;
  sepa_mandate_id: string | null;
  sepa_mandate_date: string | null;
  sepa_sequence_type: string | null;
  segment: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInsert = Omit<ClientRow, "id" | "client_number" | "created_at" | "updated_at">;
export type ClientUpdate = Partial<ClientInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchClients(): Promise<ClientRow[]> {
  return apiFetch<ClientRow[]>(BASE);
}

export async function fetchClient(id: string): Promise<ClientRow> {
  return apiFetch<ClientRow>(`${BASE}/${id}`);
}

export async function createClient(client: ClientInsert): Promise<ClientRow> {
  return apiFetch<ClientRow>(BASE, { method: "POST", body: JSON.stringify(client) });
}

export async function updateClient(id: string, client: ClientUpdate): Promise<ClientRow> {
  return apiFetch<ClientRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(client) });
}

export async function deleteClient(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
