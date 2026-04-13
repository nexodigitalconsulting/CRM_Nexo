// API layer: dashboard — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/dashboard";

export interface DashboardStats {
  totalContacts: number;
  newContactsThisMonth: number;
  totalClients: number;
  activeClients: number;
  totalQuotes: number;
  pendingQuotes: number;
  totalInvoices: number;
  pendingInvoices: number;
  totalExpenses: number;
  expensesThisMonth: number;
}

export interface DashboardWidgetStats {
  contracts: { count: number; active: number; mrr: number };
  contacts: { count: number; newThisMonth: number };
  clients: { count: number; active: number };
  quotes: { count: number; pending: number; pendingAmount: number };
  invoices: { count: number; monthlyTotal: number; pending: number };
  expenses: { count: number; monthlyTotal: number; pending: number };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchDashboardWidgetStats(): Promise<DashboardWidgetStats> {
  return apiFetch<DashboardWidgetStats>(`${BASE}?type=widget`);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(`${BASE}?type=stats`);
}
