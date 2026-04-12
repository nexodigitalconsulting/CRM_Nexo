// API layer: invoices — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/invoices";

export interface InvoiceServiceRow {
  id: string;
  invoice_id: string;
  service_id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: number;
  client_id: string;
  contract_id: string | null;
  remittance_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  irpf_percent: number;
  irpf_amount: number;
  total: number;
  notes: string | null;
  document_url: string | null;
  is_sent: boolean;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string; name: string; cif: string | null; email: string | null; iban: string | null;
  };
  contract?: { id: string; name: string | null; billing_period: string | null } | null;
  invoice_services?: InvoiceServiceRow[];
}

export type InvoiceInsert = Omit<InvoiceRow, "id" | "invoice_number" | "created_at" | "updated_at" | "client" | "contract" | "invoice_services">;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  return apiFetch<InvoiceRow[]>(BASE);
}

export async function fetchInvoice(id: string): Promise<InvoiceRow> {
  return apiFetch<InvoiceRow>(`${BASE}/${id}`);
}

export async function createInvoice(
  invoice: InvoiceInsert,
  services: Omit<InvoiceServiceRow, "id" | "invoice_id" | "created_at">[]
): Promise<InvoiceRow> {
  return apiFetch<InvoiceRow>(BASE, { method: "POST", body: JSON.stringify({ invoice, services }) });
}

export async function updateInvoice(
  id: string,
  invoice: Partial<InvoiceInsert>,
  services?: Omit<InvoiceServiceRow, "id" | "invoice_id" | "created_at">[]
): Promise<InvoiceRow> {
  return apiFetch<InvoiceRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify({ invoice, services }) });
}

export async function updateInvoiceStatus(id: string, status: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export async function markInvoiceAsSent(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=mark-sent`, { method: "PUT", body: JSON.stringify({}) });
}

export async function deleteInvoice(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function fetchContractsForInvoice(clientId: string) {
  return apiFetch(`${BASE}?action=contracts-for-client&clientId=${clientId}`);
}
