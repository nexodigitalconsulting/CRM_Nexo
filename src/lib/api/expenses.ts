// API layer: expenses — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/expenses";

export interface ExpenseRow {
  id: string;
  expense_number: string;
  supplier_name: string;
  supplier_cif: string | null;
  invoice_number: string | null;
  id_factura: string | null;
  concept: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  irpf_percent: number;
  irpf_amount: number;
  total: number;
  currency: string;
  status: string;
  document_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseInsert = Omit<ExpenseRow, "id" | "created_at" | "updated_at">;
export type ExpenseUpdate = Partial<ExpenseInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchExpenses(): Promise<ExpenseRow[]> {
  return apiFetch<ExpenseRow[]>(BASE);
}

export async function fetchExpense(id: string): Promise<ExpenseRow> {
  return apiFetch<ExpenseRow>(`${BASE}/${id}`);
}

export async function createExpense(expense: ExpenseInsert): Promise<ExpenseRow> {
  return apiFetch<ExpenseRow>(BASE, { method: "POST", body: JSON.stringify(expense) });
}

export async function updateExpense(id: string, expense: ExpenseUpdate): Promise<ExpenseRow> {
  return apiFetch<ExpenseRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(expense) });
}

export async function deleteExpense(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
