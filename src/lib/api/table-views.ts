// API layer: table-views — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/table-views";

export interface TableViewRow {
  id: string;
  user_id: string;
  entity_name: string;
  view_name: string;
  visible_columns: string[];
  column_order: string[];
  filters: Record<string, unknown>;
  sort_config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type TableViewInsert = Omit<TableViewRow, "id" | "created_at" | "updated_at">;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchTableViews(entityName: string): Promise<TableViewRow[]> {
  return apiFetch<TableViewRow[]>(`${BASE}?entityName=${encodeURIComponent(entityName)}`);
}

export async function fetchDefaultTableView(entityName: string): Promise<TableViewRow | null> {
  return apiFetch<TableViewRow | null>(`${BASE}?entityName=${encodeURIComponent(entityName)}&default=true`);
}

export async function createTableView(view: TableViewInsert): Promise<TableViewRow> {
  return apiFetch<TableViewRow>(BASE, { method: "POST", body: JSON.stringify(view) });
}

export async function updateTableView(id: string, view: Partial<TableViewInsert>): Promise<TableViewRow> {
  return apiFetch<TableViewRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(view) });
}

export async function deleteTableView(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
