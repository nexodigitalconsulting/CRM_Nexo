import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version
const CURRENT_VERSION = "v1.2.0";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "check";

    logs.push(`🔄 Acción: ${action}`);
    
    // Use Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "Supabase not configured",
        logs: ["⚠ SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    logs.push("✓ Conectado a Supabase Admin");

    // ============================================
    // ACTION: test-supabase - Test Supabase connection
    // ============================================
    if (action === "test-supabase") {
      try {
        // Try to query any table to verify connection
        const { data, error } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .limit(1);

        if (error && error.code !== "42P01") {
          throw new Error(error.message);
        }

        logs.push("✓ Conexión a Supabase exitosa");
        
        return new Response(JSON.stringify({
          success: true,
          message: "Supabase connection successful",
          logs
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        logs.push(`❌ Error de conexión: ${err.message}`);
        return new Response(JSON.stringify({
          success: false,
          error: err.message,
          logs
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ============================================
    // ACTION: check - Check database status
    // ============================================
    if (action === "check") {
      const status = {
        hasProfiles: false,
        hasUserRoles: false,
        hasClients: false,
        hasInvoices: false,
        hasSchemaVersions: false,
        currentVersion: "v0.0.0",
        missingTables: [] as string[],
        isComplete: false
      };

      // Check each required table
      const tables = [
        { name: "profiles", key: "hasProfiles" },
        { name: "user_roles", key: "hasUserRoles" },
        { name: "clients", key: "hasClients" },
        { name: "invoices", key: "hasInvoices" },
        { name: "schema_versions", key: "hasSchemaVersions" }
      ];

      for (const table of tables) {
        const { error } = await supabaseAdmin
          .from(table.name)
          .select("id")
          .limit(1);
        
        if (error?.code === "42P01") {
          status.missingTables.push(table.name);
        } else {
          (status as any)[table.key] = true;
        }
      }

      // Get current version if schema_versions exists
      if (status.hasSchemaVersions) {
        const { data } = await supabaseAdmin
          .from("schema_versions")
          .select("version")
          .order("applied_at", { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          status.currentVersion = data[0].version;
        }
      }

      status.isComplete = status.missingTables.length === 0 && 
                          status.currentVersion === CURRENT_VERSION;

      logs.push(`📊 Estado del schema:`);
      logs.push(`   - Versión: ${status.currentVersion}`);
      logs.push(`   - Tablas faltantes: ${status.missingTables.length > 0 ? status.missingTables.join(", ") : "ninguna"}`);
      logs.push(`   - Completo: ${status.isComplete ? "Sí" : "No"}`);

      return new Response(JSON.stringify({
        success: true,
        status,
        targetVersion: CURRENT_VERSION,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================
    // ACTION: create-admin - Create admin user (if first user)
    // ============================================
    if (action === "create-admin") {
      const { userId, email, fullName } = body;

      if (!userId || !email) {
        return new Response(JSON.stringify({
          success: false,
          error: "userId and email are required",
          logs: ["❌ Faltan parámetros userId o email"]
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      logs.push(`👤 Creando admin para: ${email}`);

      // Check if admin already exists
      const { data: existingAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (existingAdmins && existingAdmins.length > 0) {
        logs.push("⚠ Ya existe un administrador");
        return new Response(JSON.stringify({
          success: false,
          error: "Admin already exists",
          logs
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          user_id: userId,
          email: email,
          full_name: fullName || "Administrador"
        }, { onConflict: "user_id" });

      if (profileError) {
        logs.push(`❌ Error creando perfil: ${profileError.message}`);
        return new Response(JSON.stringify({
          success: false,
          error: profileError.message,
          logs
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      logs.push("✓ Perfil creado");

      // Create admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin"
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        logs.push(`❌ Error creando rol: ${roleError.message}`);
        return new Response(JSON.stringify({
          success: false,
          error: roleError.message,
          logs
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      logs.push("✓ Rol admin asignado");

      // Create default company settings if not exists
      const { data: existingSettings } = await supabaseAdmin
        .from("company_settings")
        .select("id")
        .limit(1);

      if (!existingSettings || existingSettings.length === 0) {
        await supabaseAdmin
          .from("company_settings")
          .insert({ name: "Mi Empresa" });
        logs.push("✓ Configuración de empresa creada");
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Admin created successfully",
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================
    // ACTION: get-setup-instructions
    // ============================================
    if (action === "get-setup-instructions") {
      return new Response(JSON.stringify({
        success: true,
        instructions: {
          step1: "Ejecutar easypanel/init-scripts/full-schema.sql en Supabase SQL Editor",
          step2: "Crear usuario admin en /setup o ejecutar bootstrap_first_admin()",
          step3: "Refrescar la aplicación",
          sqlFiles: [
            "easypanel/init-scripts/full-schema.sql - Schema completo",
            "easypanel/init-scripts/migrations/apply_all.sql - Solo migraciones"
          ]
        },
        logs: ["📋 Instrucciones de configuración generadas"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Unknown action
    return new Response(JSON.stringify({
      success: false,
      error: `Unknown action: ${action}`,
      availableActions: ["check", "test-supabase", "create-admin", "get-setup-instructions"],
      logs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Setup error:", error);
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
