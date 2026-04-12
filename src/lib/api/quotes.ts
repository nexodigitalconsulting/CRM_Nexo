// API layer: quotes — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/quotes";

export interface QuoteServiceRow {
  id: string;
  quote_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
  created_at: string;
  service?: { id: string; name: string; description: string | null };
}

export interface QuoteRow {
  id: string;
  quote_number: number;
  name: string | null;
  client_id: string | null;
  contact_id: string | null;
  status: string;
  valid_until: string | null;
  subtotal: number;
  iva_total: number;
  total: number;
  notes: string | null;
  document_url: string | null;
  is_sent: boolean;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; cif: string | null; email: string | null } | null;
  contact?: { id: string; name: string; email: string | null } | null;
  quote_services?: QuoteServiceRow[];
}

export type QuoteInsert = Omit<QuoteRow, "id" | "quote_number" | "created_at" | "updated_at" | "client" | "contact" | "quote_services">;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchQuotes(): Promise<QuoteRow[]> {
  return apiFetch<QuoteRow[]>(BASE);
}

export async function fetchQuote(id: string): Promise<QuoteRow> {
  return apiFetch<QuoteRow>(`${BASE}/${id}`);
}

export async function createQuote(
  quote: QuoteInsert,
  services: Omit<QuoteServiceRow, "id" | "quote_id" | "created_at" | "service">[]
): Promise<QuoteRow> {
  return apiFetch<QuoteRow>(BASE, { method: "POST", body: JSON.stringify({ quote, services }) });
}

export async function updateQuote(
  id: string,
  quote: Partial<QuoteInsert>,
  services?: Omit<QuoteServiceRow, "id" | "quote_id" | "created_at" | "service">[]
): Promise<QuoteRow> {
  return apiFetch<QuoteRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify({ quote, services }) });
}

export async function updateQuoteStatus(id: string, status: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export async function markQuoteAsSent(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=mark-sent`, { method: "PUT", body: JSON.stringify({}) });
}

export async function deleteQuote(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
