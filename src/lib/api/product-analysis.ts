// API layer: product-analysis — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/product-analysis";

export interface ContractProductRow {
  id: string;
  contract_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_active: boolean;
  contract: {
    id: string;
    contract_number: number;
    status: string;
    client: { id: string; name: string } | null;
  };
  service: {
    id: string;
    name: string;
    category: string | null;
  };
}

export interface InvoiceProduct {
  id: string;
  invoice_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  invoice_date: string;
  [key: string]: unknown;
}

export interface QuoteProduct {
  id: string;
  quote_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  quote_date: string;
  [key: string]: unknown;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchInvoiceProducts(): Promise<InvoiceProduct[]> {
  return apiFetch<InvoiceProduct[]>(`${BASE}?type=invoice-products`);
}

export async function fetchQuoteProducts(): Promise<QuoteProduct[]> {
  return apiFetch<QuoteProduct[]>(`${BASE}?type=quote-products`);
}

export async function fetchContractProducts(): Promise<ContractProductRow[]> {
  return apiFetch<ContractProductRow[]>(`${BASE}?type=contract-products`);
}
