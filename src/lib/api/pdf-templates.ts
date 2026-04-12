// API layer: pdf-templates — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/pdf-templates";

export interface DocumentTemplateRow {
  id: string;
  name: string;
  entity_type: "invoice" | "contract" | "quote";
  content: string;
  variables: string[] | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentTemplateInsert = Omit<DocumentTemplateRow, "id" | "created_at" | "updated_at">;
export type DocumentTemplateUpdate = Partial<Omit<DocumentTemplateInsert, "entity_type">>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchDocumentTemplates(
  entityType?: "invoice" | "contract" | "quote"
): Promise<DocumentTemplateRow[]> {
  const params = entityType ? `?entityType=${entityType}` : "";
  return apiFetch<DocumentTemplateRow[]>(`${BASE}${params}`);
}

export async function fetchDefaultDocumentTemplate(
  entityType: "invoice" | "contract" | "quote"
): Promise<DocumentTemplateRow | null> {
  return apiFetch<DocumentTemplateRow | null>(`${BASE}?entityType=${entityType}&default=true`);
}

export async function createDocumentTemplate(template: DocumentTemplateInsert): Promise<DocumentTemplateRow> {
  return apiFetch<DocumentTemplateRow>(BASE, { method: "POST", body: JSON.stringify(template) });
}

export async function updateDocumentTemplate(
  id: string,
  updates: DocumentTemplateUpdate
): Promise<DocumentTemplateRow> {
  return apiFetch<DocumentTemplateRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(updates) });
}

export async function setDefaultDocumentTemplate(id: string, _entityType: string): Promise<DocumentTemplateRow> {
  return apiFetch<DocumentTemplateRow>(`${BASE}/${id}?action=set-default`, { method: "PUT", body: JSON.stringify({}) });
}

export async function deleteDocumentTemplate(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}
