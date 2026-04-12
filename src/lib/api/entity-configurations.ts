// API layer: entity-configurations — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/entity-configurations";

export interface EntityConfigurationRow {
  id: string;
  entity_name: string;
  display_name: string;
  icon: string | null;
  fields: unknown[];
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EntityConfigurationInsert = Omit<EntityConfigurationRow, "id" | "created_at" | "updated_at">;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchEntityConfigurations(): Promise<EntityConfigurationRow[]> {
  return apiFetch<EntityConfigurationRow[]>(BASE);
}

export async function fetchEntityConfiguration(entityName: string): Promise<EntityConfigurationRow | null> {
  return apiFetch<EntityConfigurationRow | null>(`${BASE}?entityName=${encodeURIComponent(entityName)}`);
}

export async function upsertEntityConfiguration(
  entityName: string,
  config: Partial<EntityConfigurationInsert>
): Promise<EntityConfigurationRow> {
  return apiFetch<EntityConfigurationRow>(BASE, {
    method: "POST",
    body: JSON.stringify({ ...config, entity_name: entityName }),
  });
}

export async function deleteEntityConfiguration(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
