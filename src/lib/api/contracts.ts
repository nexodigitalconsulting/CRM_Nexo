// API layer: contracts — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/contracts";

export interface ContractServiceRow {
  id: string;
  contract_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service?: { id: string; name: string; description: string | null };
}

export interface ContractRow {
  id: string;
  contract_number: number;
  name: string | null;
  client_id: string;
  quote_id: string | null;
  start_date: string;
  end_date: string | null;
  billing_period: string;
  next_billing_date: string | null;
  status: string;
  payment_status: string;
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
  client?: { id: string; name: string; cif: string | null; email: string | null; iban: string | null };
  contract_services?: ContractServiceRow[];
}

export type ContractInsert = Omit<ContractRow, "id" | "contract_number" | "created_at" | "updated_at" | "client" | "contract_services">;

export interface ContractForInvoiceRow {
  id: string;
  name: string;
  contract_number: number;
  client_id: string;
  status: string;
  client: { id: string; name: string; cif: string | null } | null;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchContracts(): Promise<ContractRow[]> {
  return apiFetch<ContractRow[]>(BASE);
}

export async function fetchContract(id: string): Promise<ContractRow> {
  return apiFetch<ContractRow>(`${BASE}/${id}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchApprovedQuotes(): Promise<any[]> {
  return apiFetch<any[]>(`${BASE}?action=approved-quotes`);
}

export async function createContract(
  contract: ContractInsert,
  services: Omit<ContractServiceRow, "id" | "contract_id" | "created_at" | "updated_at" | "service">[]
): Promise<ContractRow> {
  return apiFetch<ContractRow>(BASE, { method: "POST", body: JSON.stringify({ contract, services }) });
}

export async function updateContract(
  id: string,
  contract: Partial<ContractInsert>,
  services?: Omit<ContractServiceRow, "id" | "contract_id" | "created_at" | "updated_at" | "service">[]
): Promise<ContractRow> {
  return apiFetch<ContractRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify({ contract, services }) });
}

export async function updateContractStatus(id: string, status: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export async function markContractAsSent(id: string): Promise<void> {
  await apiFetch(`${BASE}/${id}?action=mark-sent`, { method: "PUT", body: JSON.stringify({}) });
}

export async function deleteContract(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function fetchContractsForInvoice(): Promise<ContractForInvoiceRow[]> {
  return apiFetch<ContractForInvoiceRow[]>(`${BASE}?action=for-invoice`);
}
