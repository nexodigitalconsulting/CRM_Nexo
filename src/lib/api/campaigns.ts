// API layer: campaigns — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/campaigns";

export interface CampaignRow {
  id: string;
  campaign_number: number;
  name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  website: string | null;
  place_id: string | null;
  capture_date: string | null;
  sent_at: string | null;
  response_at: string | null;
  response_channel: string | null;
  last_contact_at: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignInsert = Omit<CampaignRow, "id" | "campaign_number" | "created_at" | "updated_at">;
export type CampaignUpdate = Partial<CampaignInsert>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchCampaigns(): Promise<CampaignRow[]> {
  return apiFetch<CampaignRow[]>(BASE);
}

export async function fetchCampaign(id: string): Promise<CampaignRow> {
  return apiFetch<CampaignRow>(`${BASE}/${id}`);
}

export async function createCampaign(campaign: CampaignInsert): Promise<CampaignRow> {
  return apiFetch<CampaignRow>(BASE, { method: "POST", body: JSON.stringify(campaign) });
}

export async function updateCampaign(id: string, campaign: CampaignUpdate): Promise<CampaignRow> {
  return apiFetch<CampaignRow>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(campaign) });
}

export async function deleteCampaign(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function convertCampaignToContact(
  campaignId: string,
  contactData: Record<string, unknown>,
  userId: string
): Promise<{ contactId: string }> {
  return apiFetch<{ contactId: string }>(`${BASE}/${campaignId}/convert`, {
    method: "POST",
    body: JSON.stringify({ contactData, userId }),
  });
}
