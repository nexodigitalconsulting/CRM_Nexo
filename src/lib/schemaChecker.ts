import { supabase } from "@/integrations/supabase/client";

export interface SchemaStatus {
  isComplete: boolean;
  currentVersion: string | null;
  targetVersion: string;
  hasSchemaVersions: boolean;
  missingComponents: string[];
  environment: "cloud" | "self-hosted" | "unknown";
}

export const TARGET_VERSION = "v1.2.0";

// Required tables for the CRM to function
const REQUIRED_TABLES = [
  "profiles",
  "user_roles",
  "company_settings",
  "contacts",
  "clients",
  "services",
  "quotes",
  "quote_services",
  "contracts",
  "contract_services",
  "invoices",
  "invoice_services",
  "expenses",
  "remittances",
  "campaigns",
  "calendar_categories",
  "calendar_events",
  "email_settings",
  "email_templates",
  "notification_rules",
  "pdf_settings",
  "schema_versions",
  "invoice_products",
  "quote_products",
];

/**
 * Check schema directly via Supabase client (for self-hosted environments)
 * This works even when Edge Functions are not available
 */
export async function checkSchemaDirectly(): Promise<SchemaStatus> {
  const status: SchemaStatus = {
    isComplete: false,
    currentVersion: null,
    targetVersion: TARGET_VERSION,
    hasSchemaVersions: false,
    missingComponents: [],
    environment: "unknown",
  };

  try {
    // 1. Check if schema_versions table exists by trying to query it
    // Use profiles table to check connection first, then try schema_versions via RPC or direct
    const { data: profileCheck, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (profileError?.code === "42P01") {
      // Profiles table doesn't exist - needs full setup
      status.missingComponents.push("profiles table");
      return status;
    }

    // Try to check schema_versions by querying pdf_settings (which was added in v1.1.0)
    const { data: pdfCheck, error: pdfError } = await supabase
      .from("pdf_settings")
      .select("id")
      .limit(1);

    if (!pdfError) {
      // pdf_settings exists, schema is at least v1.1.0
      status.hasSchemaVersions = true;
      status.currentVersion = "v1.1.0"; // Minimum confirmed version
    } else if (pdfError?.code === "42P01") {
      status.missingComponents.push("pdf_settings table (v1.1.0)");
    }

    // 2. Check critical tables exist by querying them
    const tablesToCheck = ["user_roles", "company_settings", "clients"];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table as "profiles")
          .select("id")
          .limit(1);
        
        if (error?.code === "42P01") {
          status.missingComponents.push(`${table} table`);
        }
      } catch {
        status.missingComponents.push(`${table} table`);
      }
    }

    // 3. Check for invoice_products and quote_products (v1.2.0 additions)
    const { error: ipError } = await supabase
      .from("invoice_products")
      .select("id")
      .limit(1);
    
    if (ipError?.code === "42P01") {
      status.missingComponents.push("invoice_products table (v1.2.0)");
    } else if (!ipError) {
      // invoice_products exists, schema is v1.2.0
      status.currentVersion = "v1.2.0";
    }

    const { error: qpError } = await supabase
      .from("quote_products")
      .select("id")
      .limit(1);
    
    if (qpError?.code === "42P01") {
      status.missingComponents.push("quote_products table (v1.2.0)");
    }

    // 4. Check email_settings for signature_html column
    try {
      const { data, error } = await supabase
        .from("email_settings")
        .select("signature_html")
        .limit(1);
      
      if (error?.message?.includes("signature_html")) {
        status.missingComponents.push("signature_html column (v1.2.0)");
      }
    } catch {
      // Column check failed, might be missing
    }

    // 5. Determine environment
    // If we can query tables but no Edge Functions, likely self-hosted
    if (status.hasSchemaVersions || status.missingComponents.length < REQUIRED_TABLES.length) {
      status.environment = "self-hosted"; // Assume self-hosted if schema exists but Edge Functions might not
    }

    // 6. Determine if complete
    status.isComplete = 
      status.missingComponents.length === 0 && 
      status.currentVersion === TARGET_VERSION;

    return status;
  } catch (error) {
    console.error("Schema check error:", error);
    return status;
  }
}

/**
 * Check if base tables exist (minimum for app to start)
 */
export async function checkBaseTables(): Promise<{ exists: boolean; missing: string[] }> {
  const missing: string[] = [];

  const { error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);
  
  if (profileError?.code === "42P01") {
    missing.push("profiles");
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .select("id")
    .limit(1);
  
  if (roleError?.code === "42P01") {
    missing.push("user_roles");
  }

  return {
    exists: missing.length === 0,
    missing,
  };
}

/**
 * Get migration SQL content for display to users
 */
export function getMigrationSQL(): string {
  return `-- Ejecuta este SQL en Supabase SQL Editor
-- O usa el archivo: easypanel/init-scripts/migrations/apply_all.sql

-- Para instalaciones nuevas, ejecuta:
-- easypanel/init-scripts/full-schema.sql

-- Para actualizar instalaciones existentes:
-- easypanel/init-scripts/migrations/apply_all.sql

-- Ver versión actual:
SELECT get_current_schema_version();

-- Ver historial de migraciones:
SELECT version, description, applied_at 
FROM schema_versions 
ORDER BY applied_at;
`;
}

/**
 * Compare versions (simple semver comparison)
 */
export function compareVersions(current: string | null, target: string): number {
  if (!current) return -1;
  
  const parseVersion = (v: string) => {
    const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  };

  const [cMajor, cMinor, cPatch] = parseVersion(current);
  const [tMajor, tMinor, tPatch] = parseVersion(target);

  if (cMajor !== tMajor) return cMajor - tMajor;
  if (cMinor !== tMinor) return cMinor - tMinor;
  return cPatch - tPatch;
}
