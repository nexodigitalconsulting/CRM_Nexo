import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version - UPDATE THIS when adding new migrations
const CURRENT_VERSION = "v1.4.0";

// Migration definitions
const MIGRATIONS = [
  { version: "v1.0.0", description: "Schema base del CRM" },
  { version: "v1.1.0", description: "Tabla pdf_settings para personalización de documentos" },
  { version: "v1.2.0", description: "Columna signature_html, tablas de productos y triggers" },
  { version: "v1.3.0", description: "RLS para schema_versions" },
  { version: "v1.4.0", description: "Columnas is_sent y sent_at en invoices, quotes, contracts" }
];

// Version comparison helper
function compareVersions(v1: string | null, v2: string): number {
  if (!v1) return -1;
  
  const parseVersion = (v: string) => {
    const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  };

  const [a1, a2, a3] = parseVersion(v1);
  const [b1, b2, b3] = parseVersion(v2);

  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  const startTime = Date.now();
  
  const log = (msg: string) => {
    const elapsed = Date.now() - startTime;
    const entry = `[${elapsed}ms] ${msg}`;
    logs.push(entry);
    console.log(`[db-migrate] ${entry}`);
  };

  try {
    log("🔄 Iniciando verificación de migraciones...");
    log(`📋 Versión objetivo del código: ${CURRENT_VERSION}`);
    
    // Use Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log("❌ Variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas");
      return new Response(JSON.stringify({
        success: false,
        error: "Supabase not configured",
        currentVersion: "unknown",
        targetVersion: CURRENT_VERSION,
        isUpToDate: false,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    log(`✓ SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    log("✓ Cliente Supabase Admin creado");

    // ============================================
    // STEP 1: Check if base tables exist
    // ============================================
    log("📊 Verificando tablas base...");
    
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1);

    if (profilesError?.code === "42P01") {
      log("❌ Tabla profiles no existe - ejecutar setup");
      return new Response(JSON.stringify({
        success: false,
        error: "Base tables missing - profiles",
        requiresSetup: true,
        currentVersion: "v0.0.0",
        targetVersion: CURRENT_VERSION,
        isUpToDate: false,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    log("✓ Tabla profiles existe");

    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .limit(1);

    if (clientsError?.code === "42P01") {
      log("❌ Tabla clients no existe - ejecutar setup");
      return new Response(JSON.stringify({
        success: false,
        error: "Base tables missing - clients",
        requiresSetup: true,
        currentVersion: "v0.0.0",
        targetVersion: CURRENT_VERSION,
        isUpToDate: false,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    log("✓ Tabla clients existe");

    // ============================================
    // STEP 2: Check schema_versions table
    // ============================================
    log("📋 Verificando tabla schema_versions...");
    
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from("schema_versions")
      .select("version, applied_at, description")
      .order("applied_at", { ascending: false })
      .limit(10);

    let currentVersion = "v0.0.0";
    let schemaVersionsExists = true;

    if (versionError?.code === "42P01") {
      schemaVersionsExists = false;
      log("⚠️ Tabla schema_versions NO existe");
    } else if (versionError) {
      log(`⚠️ Error consultando schema_versions: ${versionError.message}`);
    } else if (versionData && versionData.length > 0) {
      currentVersion = versionData[0].version;
      log(`✓ Versiones en BD: ${versionData.map(v => v.version).join(", ")}`);
      log(`📌 Versión actual en BD: ${currentVersion}`);
    } else {
      log("⚠️ Tabla schema_versions vacía");
    }

    // ============================================
    // STEP 3: Check for missing components
    // ============================================
    log("🔍 Verificando componentes específicos...");
    const missingComponents: string[] = [];

    // Check pdf_settings (v1.1.0)
    const { error: pdfError } = await supabaseAdmin
      .from("pdf_settings")
      .select("id")
      .limit(1);
    
    if (pdfError?.code === "42P01") {
      missingComponents.push("pdf_settings table (v1.1.0)");
      log("⚠️ Falta: pdf_settings (v1.1.0)");
    } else {
      log("✓ pdf_settings existe");
    }

    // Check invoice_products (v1.2.0)
    const { error: invProdError } = await supabaseAdmin
      .from("invoice_products")
      .select("id")
      .limit(1);
    
    if (invProdError?.code === "42P01") {
      missingComponents.push("invoice_products table (v1.2.0)");
      log("⚠️ Falta: invoice_products (v1.2.0)");
    } else {
      log("✓ invoice_products existe");
    }

    // Check quote_products (v1.2.0)
    const { error: quoteProdError } = await supabaseAdmin
      .from("quote_products")
      .select("id")
      .limit(1);
    
    if (quoteProdError?.code === "42P01") {
      missingComponents.push("quote_products table (v1.2.0)");
      log("⚠️ Falta: quote_products (v1.2.0)");
    } else {
      log("✓ quote_products existe");
    }

    // Check email_settings.signature_html column (v1.2.0)
    const { error: emailError } = await supabaseAdmin
      .from("email_settings")
      .select("signature_html")
      .limit(1);

    if (emailError?.message?.includes("signature_html")) {
      missingComponents.push("email_settings.signature_html (v1.2.0)");
      log("⚠️ Falta: email_settings.signature_html (v1.2.0)");
    } else if (!emailError) {
      log("✓ email_settings.signature_html existe");
    }

    // Check invoices.is_sent column (v1.4.0)
    const { error: invoiceSentError } = await supabaseAdmin
      .from("invoices")
      .select("is_sent, sent_at")
      .limit(1);

    if (invoiceSentError?.message?.includes("is_sent") || invoiceSentError?.message?.includes("sent_at")) {
      missingComponents.push("invoices.is_sent/sent_at (v1.4.0)");
      log("⚠️ Falta: invoices.is_sent/sent_at (v1.4.0)");
    } else if (!invoiceSentError) {
      log("✓ invoices.is_sent/sent_at existe");
    }

    // Check quotes.is_sent column (v1.4.0)
    const { error: quoteSentError } = await supabaseAdmin
      .from("quotes")
      .select("is_sent, sent_at")
      .limit(1);

    if (quoteSentError?.message?.includes("is_sent") || quoteSentError?.message?.includes("sent_at")) {
      missingComponents.push("quotes.is_sent/sent_at (v1.4.0)");
      log("⚠️ Falta: quotes.is_sent/sent_at (v1.4.0)");
    } else if (!quoteSentError) {
      log("✓ quotes.is_sent/sent_at existe");
    }

    // Check contracts.is_sent column (v1.4.0)
    const { error: contractSentError } = await supabaseAdmin
      .from("contracts")
      .select("is_sent, sent_at")
      .limit(1);

    if (contractSentError?.message?.includes("is_sent") || contractSentError?.message?.includes("sent_at")) {
      missingComponents.push("contracts.is_sent/sent_at (v1.4.0)");
      log("⚠️ Falta: contracts.is_sent/sent_at (v1.4.0)");
    } else if (!contractSentError) {
      log("✓ contracts.is_sent/sent_at existe");
    }

    // ============================================
    // STEP 4: Determine status
    // ============================================
    log("📊 Calculando estado final...");
    
    const versionComparison = compareVersions(currentVersion, CURRENT_VERSION);
    const versionOk = versionComparison >= 0; // DB >= Code is OK
    const isUpToDate = versionOk && missingComponents.length === 0;

    log(`   Versión BD: ${currentVersion}`);
    log(`   Versión código: ${CURRENT_VERSION}`);
    log(`   Comparación: ${versionComparison} (${versionComparison >= 0 ? "OK" : "Actualización necesaria"})`);
    log(`   Componentes faltantes: ${missingComponents.length}`);
    log(`   Estado: ${isUpToDate ? "✅ ACTUALIZADO" : "⚠️ REQUIERE ACTUALIZACIÓN"}`);

    const elapsed = Date.now() - startTime;
    log(`⏱️ Verificación completada en ${elapsed}ms`);

    return new Response(JSON.stringify({
      success: true,
      currentVersion,
      targetVersion: CURRENT_VERSION,
      versionComparison,
      migrationsApplied: 0,
      isUpToDate,
      needsMigration: !isUpToDate,
      missingComponents: missingComponents.length > 0 ? missingComponents : undefined,
      schemaVersionsExists,
      logs,
      instructions: !isUpToDate 
        ? "Para aplicar migraciones, ejecute: easypanel/init-scripts/migrations/apply_all.sql" 
        : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[db-migrate] Error:", error);
    log(`❌ Error: ${error.message}`);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      currentVersion: "unknown",
      targetVersion: CURRENT_VERSION,
      isUpToDate: false,
      logs
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
