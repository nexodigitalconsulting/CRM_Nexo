import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version - UPDATE THIS when adding new migrations
const CURRENT_VERSION = "v1.4.0";

// Migration definitions (SQL stored for reference, applied via Supabase client)
const MIGRATIONS = [
  { version: "v1.0.0", description: "Schema base del CRM" },
  { version: "v1.1.0", description: "Tabla pdf_settings para personalización de documentos" },
  { version: "v1.2.0", description: "Columna signature_html, tablas de productos y triggers" },
  { version: "v1.3.0", description: "RLS para schema_versions" },
  { version: "v1.4.0", description: "Columnas is_sent y sent_at en invoices" }
];

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  
  try {
    logs.push("🔄 Iniciando verificación de migraciones...");
    
    // Use Supabase Admin Client instead of direct TCP connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logs.push("⚠ Supabase no configurado");
      return new Response(JSON.stringify({
        success: false,
        error: "Supabase not configured",
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    logs.push("✓ Conectado a Supabase");

    // ============================================
    // STEP 1: Check if base tables exist
    // ============================================
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1);

    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .limit(1);

    // If both tables don't exist (error), requires setup
    if (profilesError?.code === "42P01" || clientsError?.code === "42P01") {
      logs.push("⚠ Tablas base no encontradas - ejecutar setup primero");
      return new Response(JSON.stringify({
        success: false,
        error: "Base tables missing",
        requiresSetup: true,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logs.push("✓ Tablas base verificadas");

    // ============================================
    // STEP 2: Check schema_versions table
    // ============================================
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from("schema_versions")
      .select("version, applied_at")
      .order("applied_at", { ascending: false })
      .limit(1);

    let currentVersion = "v0.0.0";
    let schemaVersionsExists = true;

    if (versionError?.code === "42P01") {
      // Table doesn't exist
      schemaVersionsExists = false;
      logs.push("⚠ Tabla schema_versions no existe");
    } else if (versionData && versionData.length > 0) {
      currentVersion = versionData[0].version;
      logs.push(`📌 Versión actual: ${currentVersion}`);
    }

    // ============================================
    // STEP 3: Check for missing components
    // ============================================
    const missingComponents: string[] = [];

    // Check pdf_settings
    const { error: pdfError } = await supabaseAdmin
      .from("pdf_settings")
      .select("id")
      .limit(1);
    
    if (pdfError?.code === "42P01") {
      missingComponents.push("pdf_settings table");
    }

    // Check invoice_products
    const { error: invProdError } = await supabaseAdmin
      .from("invoice_products")
      .select("id")
      .limit(1);
    
    if (invProdError?.code === "42P01") {
      missingComponents.push("invoice_products table");
    }

    // Check quote_products
    const { error: quoteProdError } = await supabaseAdmin
      .from("quote_products")
      .select("id")
      .limit(1);
    
    if (quoteProdError?.code === "42P01") {
      missingComponents.push("quote_products table");
    }

    // Check email_settings.signature_html column
    const { data: emailData, error: emailError } = await supabaseAdmin
      .from("email_settings")
      .select("signature_html")
      .limit(1);

    if (emailError?.message?.includes("signature_html")) {
      missingComponents.push("email_settings.signature_html column");
    }

    // Check invoices.is_sent column
    const { data: invoiceSentData, error: invoiceSentError } = await supabaseAdmin
      .from("invoices")
      .select("is_sent")
      .limit(1);

    if (invoiceSentError?.message?.includes("is_sent")) {
      missingComponents.push("invoices.is_sent column");
    }

    // Check invoices.sent_at column
    const { data: invoiceSentAtData, error: invoiceSentAtError } = await supabaseAdmin
      .from("invoices")
      .select("sent_at")
      .limit(1);

    if (invoiceSentAtError?.message?.includes("sent_at")) {
      missingComponents.push("invoices.sent_at column");
    }

    // ============================================
    // STEP 4: Determine status
    // ============================================
    const isUpToDate = currentVersion === CURRENT_VERSION && missingComponents.length === 0;

    if (isUpToDate) {
      logs.push(`✅ Base de datos actualizada (${currentVersion})`);
      return new Response(JSON.stringify({
        success: true,
        currentVersion,
        targetVersion: CURRENT_VERSION,
        migrationsApplied: 0,
        isUpToDate: true,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Need migrations
    logs.push(`🔄 Se requieren actualizaciones`);
    logs.push(`   Versión actual: ${currentVersion}`);
    logs.push(`   Versión objetivo: ${CURRENT_VERSION}`);
    
    if (missingComponents.length > 0) {
      logs.push(`   Componentes faltantes: ${missingComponents.join(", ")}`);
    }

    // Return status indicating migrations needed
    // Note: In self-hosted environments, migrations are applied manually
    return new Response(JSON.stringify({
      success: true,
      currentVersion,
      targetVersion: CURRENT_VERSION,
      migrationsApplied: 0,
      isUpToDate: false,
      needsMigration: true,
      missingComponents,
      logs,
      instructions: "Para aplicar migraciones, ejecute: easypanel/init-scripts/migrations/apply_all.sql"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Migration check error:", error);
    logs.push(`❌ Error: ${error.message}`);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      logs
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
