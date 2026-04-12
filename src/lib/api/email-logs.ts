// API layer: email-logs — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/email-logs";

export interface EmailLogRow {
  id: string;
  user_id: string | null;
  sender_email: string;
  sender_name: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_preview: string | null;
  attachments: unknown[];
  attachment_count: number;
  entity_type: string | null;
  entity_id: string | null;
  provider: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

export interface GmailConfigRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  email_address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchEmailLogs(): Promise<EmailLogRow[]> {
  return apiFetch<EmailLogRow[]>(BASE);
}

export async function fetchGmailConfig(): Promise<GmailConfigRow | null> {
  return apiFetch<GmailConfigRow | null>(`${BASE}?type=gmail-config`);
}
