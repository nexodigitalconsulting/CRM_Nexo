// API layer: remittances — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/remittances";

export interface RemittancePaymentRow {
  id: string;
  remittance_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  status: string;
  return_reason: string | null;
  created_at: string;
  created_by: string | null;
  invoice?: { invoice_number: number; client?: { name: string } | null } | null;
}

export interface RemittanceRow {
  id: string;
  remittance_number: number;
  code: string | null;
  issue_date: string;
  status: string;
  total_amount: number;
  invoice_count: number;
  collection_date: string | null;
  sent_to_bank_at: string | null;
  paid_amount: number;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  notes: string | null;
  xml_file_url: string | null;
  n19_file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoices?: Array<{
    id: string; invoice_number: number; total: number; status: string;
    issue_date: string; due_date: string | null;
    client: { id: string; name: string; iban: string | null; bic: string | null; sepa_mandate_id: string | null; sepa_mandate_date: string | null; sepa_sequence_type: string | null };
    payments?: RemittancePaymentRow[];
  }>;
  payments?: RemittancePaymentRow[];
}

export interface RemittanceInsert {
  code?: string | null;
  issue_date: string;
  collection_date?: string | null;
  invoice_count: number;
  total_amount: number;
  status: string;
  sent_to_bank_at?: string | null;
  paid_amount?: number;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  notes?: string | null;
  xml_file_url?: string | null;
  n19_file_url?: string | null;
  created_by?: string | null;
}
export type RemittanceUpdate = Partial<RemittanceInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchRemittances(): Promise<RemittanceRow[]> {
  return apiFetch<RemittanceRow[]>(BASE);
}

export async function fetchRemittance(id: string): Promise<RemittanceRow> {
  return apiFetch<RemittanceRow>(`${BASE}/${id}`);
}

export interface AvailableInvoiceRow {
  id: string;
  invoice_number: number;
  total: number | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  client?: {
    id: string;
    name: string;
    iban: string | null;
    bic: string | null;
    sepa_mandate_id: string | null;
    sepa_mandate_date: string | null;
    sepa_sequence_type: string | null;
  } | null;
}

export async function fetchAvailableInvoicesForRemittance(): Promise<AvailableInvoiceRow[]> {
  return apiFetch<AvailableInvoiceRow[]>(`/api/data/invoices?action=available-for-remittance`);
}

export async function createRemittance(remittance: RemittanceInsert): Promise<RemittanceRow> {
  return apiFetch<RemittanceRow>(BASE, { method: "POST", body: JSON.stringify(remittance) });
}

export async function updateRemittance(id: string, remittance: RemittanceUpdate): Promise<RemittanceRow> {
  return apiFetch<RemittanceRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(remittance) });
}

export async function addInvoicesToRemittance(remittanceId: string, invoiceIds: string[]): Promise<void> {
  await apiFetch(`${BASE}/${remittanceId}/invoices`, {
    method: "POST",
    body: JSON.stringify({ invoiceIds, action: "add" }),
  });
}

export async function removeInvoicesFromRemittance(remittanceId: string, invoiceIds: string[]): Promise<void> {
  await apiFetch(`${BASE}/${remittanceId}/invoices`, {
    method: "POST",
    body: JSON.stringify({ invoiceIds, action: "remove" }),
  });
}

export async function registerRemittancePayment(
  remittanceId: string,
  payments: Array<{ invoice_id: string; amount: number; payment_date: string; status: string; return_reason?: string }>,
  userId: string
): Promise<void> {
  await apiFetch(`${BASE}/${remittanceId}/payments`, {
    method: "POST",
    body: JSON.stringify({ payments, userId }),
  });
}

export async function cancelRemittance(id: string, reason: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=cancel`, { method: "PUT", body: JSON.stringify({ reason }) });
}

export async function markRemittanceAsSent(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=mark-sent`, { method: "PUT", body: JSON.stringify({}) });
}

export async function deleteRemittance(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
