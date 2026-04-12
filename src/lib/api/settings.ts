// API layer: settings — Drizzle/PostgreSQL via Next.js API routes
const BASE = "/api/data/settings";

export interface CompanySettingsRow {
  id: string;
  name: string;
  cif: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  iban: string | null;
  bic: string | null;
  sepa_creditor_id: string | null;
  currency: string | null;
  language: string | null;
  timezone: string | null;
  date_format: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfSettingsRow {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  show_logo: boolean;
  logo_position: string;
  show_iban_footer: boolean;
  show_notes: boolean;
  show_discounts_column: boolean;
  header_style: string;
  font_size_base: number;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function fetchCompanySettings(): Promise<CompanySettingsRow | null> {
  return apiFetch<CompanySettingsRow | null>(BASE);
}

export async function upsertCompanySettings(settings: Partial<CompanySettingsRow>): Promise<CompanySettingsRow> {
  return apiFetch<CompanySettingsRow>(BASE, { method: "PUT", body: JSON.stringify(settings) });
}

// Logo upload via Next.js API route — delegates to R2 on the server
export async function uploadCompanyLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
  if (!res.ok) { const err = await res.text(); throw new Error(err || "Error al subir el logo"); }
  const { url } = await res.json() as { url: string };
  return url;
}

// PDF Settings
export async function fetchPdfSettings(): Promise<PdfSettingsRow | null> {
  return apiFetch<PdfSettingsRow | null>(`${BASE}?type=pdf`);
}

export async function upsertPdfSettings(settings: Partial<PdfSettingsRow>): Promise<PdfSettingsRow> {
  return apiFetch<PdfSettingsRow>(`${BASE}?type=pdf`, { method: "PUT", body: JSON.stringify(settings) });
}
