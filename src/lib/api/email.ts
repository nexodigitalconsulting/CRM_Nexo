// API layer: email — Drizzle/PostgreSQL via Next.js API routes
const BASE_SETTINGS = "/api/data/email/settings";
const BASE_TEMPLATES = "/api/data/email/templates";
const BASE_RULES = "/api/data/email/notification-rules";
const BASE_QUEUE = "/api/data/email/queue";
const BASE_PREFS = "/api/data/email/preferences";

export interface EmailSettingsRow {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_email: string;
  from_name: string | null;
  signature_html: string | null;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateRow {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRuleRow {
  id: string;
  name: string;
  rule_type: string;
  description: string | null;
  days_threshold: number;
  is_active: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  template?: EmailTemplateRow | null;
}

export interface NotificationQueueRow {
  id: string;
  rule_type: string;
  entity_type: string;
  entity_id: string;
  client_id: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  client?: { name: string; email: string | null } | null;
}

export interface ClientNotificationPreferenceRow {
  id: string;
  client_id: string;
  rule_type: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendEmailPayload {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  entityType?: string;
  entityId?: string;
  attachPdf?: boolean;
  pdfBase64?: string;
  pdfHtml?: string;
  pdfFilename?: string;
  attachments?: Array<{ filename: string; content: string; encoding: string }>;
}

export interface NotificationHistoryResult {
  data: NotificationQueueRow[];
  totalCount: number;
  totalPages: number;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

// Email Settings
export async function fetchEmailSettings(): Promise<EmailSettingsRow | null> {
  return apiFetch<EmailSettingsRow | null>(BASE_SETTINGS);
}

export async function upsertEmailSettings(settings: Partial<EmailSettingsRow>): Promise<EmailSettingsRow> {
  return apiFetch<EmailSettingsRow>(BASE_SETTINGS, { method: "PUT", body: JSON.stringify(settings) });
}

// Send email via API route
export async function sendEmail(payload: SendEmailPayload): Promise<unknown> {
  return apiFetch("/api/email/send", { method: "POST", body: JSON.stringify(payload) });
}

// Test email connection
export async function testEmailConnection(): Promise<unknown> {
  return apiFetch("/api/email/send", { method: "POST", body: JSON.stringify({ test: true }) });
}

// Email Templates
export async function fetchEmailTemplates(): Promise<EmailTemplateRow[]> {
  return apiFetch<EmailTemplateRow[]>(BASE_TEMPLATES);
}

export async function upsertEmailTemplate(
  id: string | null,
  template: Partial<EmailTemplateRow>
): Promise<EmailTemplateRow> {
  if (id) {
    return apiFetch<EmailTemplateRow>(`${BASE_TEMPLATES}/${id}`, { method: "PUT", body: JSON.stringify(template) });
  }
  return apiFetch<EmailTemplateRow>(BASE_TEMPLATES, { method: "POST", body: JSON.stringify(template) });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await fetch(`${BASE_TEMPLATES}/${id}`, { method: "DELETE" });
}

// Notification Rules
export async function fetchNotificationRules(): Promise<NotificationRuleRow[]> {
  return apiFetch<NotificationRuleRow[]>(BASE_RULES);
}

export async function upsertNotificationRule(
  id: string | null,
  rule: Partial<NotificationRuleRow>
): Promise<NotificationRuleRow> {
  if (id) {
    return apiFetch<NotificationRuleRow>(`${BASE_RULES}/${id}`, { method: "PUT", body: JSON.stringify(rule) });
  }
  return apiFetch<NotificationRuleRow>(BASE_RULES, { method: "POST", body: JSON.stringify(rule) });
}

export async function deleteNotificationRule(id: string): Promise<void> {
  await fetch(`${BASE_RULES}/${id}`, { method: "DELETE" });
}

// Notification Queue
export async function fetchNotificationQueue(): Promise<NotificationQueueRow[]> {
  return apiFetch<NotificationQueueRow[]>(BASE_QUEUE);
}

export async function fetchClientNotificationPreferences(clientId: string): Promise<ClientNotificationPreferenceRow[]> {
  return apiFetch<ClientNotificationPreferenceRow[]>(`${BASE_PREFS}?clientId=${clientId}`);
}

export async function upsertClientNotificationPreference(
  clientId: string,
  ruleType: string,
  isEnabled: boolean
): Promise<ClientNotificationPreferenceRow> {
  return apiFetch<ClientNotificationPreferenceRow>(BASE_PREFS, {
    method: "POST",
    body: JSON.stringify({ clientId, ruleType, isEnabled }),
  });
}

export async function fetchNotificationHistory(
  year?: number,
  page = 1,
  pageSize = 20
): Promise<NotificationHistoryResult> {
  const params = new URLSearchParams({ type: "history", page: String(page), pageSize: String(pageSize) });
  if (year) params.set("year", String(year));
  return apiFetch<NotificationHistoryResult>(`${BASE_QUEUE}?${params}`);
}

export async function fetchNotificationHistoryYears(): Promise<number[]> {
  return apiFetch<number[]>(`${BASE_QUEUE}?type=years`);
}
