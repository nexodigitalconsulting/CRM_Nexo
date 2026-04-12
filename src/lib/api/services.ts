// API layer: services — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/services";

export interface ServiceRow {
  id: string;
  service_number: number;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  iva_percent: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceInsert = Omit<ServiceRow, "id" | "service_number" | "created_at" | "updated_at">;
export type ServiceUpdate = Partial<ServiceInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchServices(): Promise<ServiceRow[]> {
  return apiFetch<ServiceRow[]>(BASE);
}

export async function fetchActiveServices(): Promise<ServiceRow[]> {
  return apiFetch<ServiceRow[]>(`${BASE}?active=true`);
}

export async function fetchService(id: string): Promise<ServiceRow> {
  return apiFetch<ServiceRow>(`${BASE}/${id}`);
}

export async function createService(service: ServiceInsert): Promise<ServiceRow> {
  return apiFetch<ServiceRow>(BASE, { method: "POST", body: JSON.stringify(service) });
}

export async function updateService(id: string, service: ServiceUpdate): Promise<ServiceRow> {
  return apiFetch<ServiceRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(service) });
}

export async function deleteService(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function checkServiceUsage(id: string): Promise<{
  invoiceCount: number;
  quoteCount: number;
  contractCount: number;
}> {
  return apiFetch(`${BASE}/${id}/usage`);
}
