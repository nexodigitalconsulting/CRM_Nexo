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
    // 1. Check if profiles table exists (basic connectivity test)
    const { error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (profileError?.code === "42P01") {
      status.missingComponents.push("profiles table");
      return status;
    }

    // 2. Check schema_versions table EXPLICITLY
    const { data: schemaVersionData, error: schemaVersionError } = await supabase
      .from("schema_versions")
      .select("version")
      .order("applied_at", { ascending: false })
      .limit(1);

    if (schemaVersionError?.code === "42P01") {
      // schema_versions table doesn't exist
      status.hasSchemaVersions = false;
      status.missingComponents.push("schema_versions table");
    } else if (!schemaVersionError && schemaVersionData?.length > 0) {
      // schema_versions exists and has data
      status.hasSchemaVersions = true;
      status.currentVersion = schemaVersionData[0].version;
    } else if (!schemaVersionError) {
      // Table exists but is empty
      status.hasSchemaVersions = true;
      status.currentVersion = "v0.0.0";
    }

    // 3. Check critical tables
    const tablesToCheck = ["user_roles", "company_settings", "clients"];
    
    for (const table of tablesToCheck) {
      const { error } = await supabase
        .from(table as "profiles")
        .select("id")
        .limit(1);
      
      if (error?.code === "42P01") {
        status.missingComponents.push(`${table} table`);
      }
    }

    // 4. Check pdf_settings (v1.1.0)
    const { error: pdfError } = await supabase
      .from("pdf_settings")
      .select("id")
      .limit(1);

    if (pdfError?.code === "42P01") {
      status.missingComponents.push("pdf_settings table (v1.1.0)");
    }

    // 5. Check invoice_products and quote_products (v1.2.0)
    const { error: ipError } = await supabase
      .from("invoice_products")
      .select("id")
      .limit(1);
    
    if (ipError?.code === "42P01") {
      status.missingComponents.push("invoice_products table (v1.2.0)");
    }

    const { error: qpError } = await supabase
      .from("quote_products")
      .select("id")
      .limit(1);
    
    if (qpError?.code === "42P01") {
      status.missingComponents.push("quote_products table (v1.2.0)");
    }

    // 6. Check email_settings for signature_html column
    try {
      const { error } = await supabase
        .from("email_settings")
        .select("signature_html")
        .limit(1);
      
      if (error?.message?.includes("signature_html")) {
        status.missingComponents.push("signature_html column (v1.2.0)");
      }
    } catch {
      // Column check failed
    }

    // 7. Determine if complete
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
