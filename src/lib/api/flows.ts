export interface FlowRow {
  id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  n8n_workflow_id: string | null;
  status: "active" | "paused" | "inactive";
  trigger_type: string;
  last_run_at: string | null;
  execution_count: number;
  success_count: number;
  success_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FlowInsertPayload = {
  name: string;
  description?: string | null;
  n8n_workflow_id?: string | null;
  status?: "active" | "paused" | "inactive";
  trigger_type?: string;
};

const BASE = "/api/data/flows";

export async function fetchFlows(): Promise<FlowRow[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<FlowRow[]>;
}

export async function createFlow(data: FlowInsertPayload): Promise<FlowRow> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<FlowRow>;
}

export async function updateFlow(id: string, data: Partial<FlowInsertPayload> & { status?: "active" | "paused" | "inactive" }): Promise<FlowRow> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<FlowRow>;
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}
