import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("setup-database: Request received", { method: req.method });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, userId, email, fullName } = body;
    console.log("setup-database: Action:", action, "userId:", userId);

    // Verificar variables de entorno
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("setup-database: Missing environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuración del servidor incompleta (faltan variables de entorno)",
          logs: ["❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas"],
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crear cliente con service_role para operaciones admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const logs: string[] = [];

    if (action === "init") {
      logs.push("Verificando conexión a base de datos...");
      console.log("setup-database: Checking database connection");

      try {
        // Verificar si ya existen las tablas
        const { data: existingTables, error: tablesError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .limit(1);

        console.log("setup-database: Profiles check result:", { existingTables, error: tablesError });

        if (tablesError) {
          logs.push(`⚠️ No se pudo acceder a la tabla profiles: ${tablesError.message}`);
          logs.push("Las tablas pueden no existir aún.");
          logs.push("");
          logs.push("Para crear las tablas:");
          logs.push("1. Ve a Supabase Studio → SQL Editor");
          logs.push("2. Ejecuta el archivo: easypanel/init-scripts/full-schema.sql");
          
          return new Response(
            JSON.stringify({
              success: false,
              logs,
              error: "Tablas no encontradas. Ejecuta el schema SQL en Supabase Studio.",
              needsManualSetup: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Las tablas existen
        logs.push("✅ Las tablas ya existen en la base de datos");
        
        // Verificar company_settings
        const { data: company } = await supabaseAdmin
          .from("company_settings")
          .select("id")
          .limit(1);
        
        if (company && company.length > 0) {
          logs.push("✅ Configuración de empresa existe");
        } else {
          logs.push("⚠️ No hay configuración de empresa (se creará con el admin)");
        }

        return new Response(
          JSON.stringify({ success: true, logs, message: "Schema ya existe" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (dbError: any) {
        console.error("setup-database: Database error:", dbError);
        logs.push(`❌ Error de base de datos: ${dbError.message}`);
        return new Response(
          JSON.stringify({
            success: false,
            logs,
            error: dbError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "create-admin") {
      if (!userId) {
        throw new Error("userId es requerido");
      }

      logs.push(`Configurando admin para usuario ${userId}...`);
      console.log("setup-database: Creating admin for", userId);

      // Verificar si ya existe el perfil
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("setup-database: Profile check:", { existingProfile, profileCheckError });

      if (!existingProfile) {
        // Crear perfil
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            user_id: userId,
            email: email,
            full_name: fullName || "Administrador",
          });

        if (profileError) {
          console.error("setup-database: Profile creation error:", profileError);
          logs.push(`❌ Error creando perfil: ${profileError.message}`);
          throw profileError;
        }
        logs.push("✅ Perfil creado");
      } else {
        logs.push("ℹ️ Perfil ya existe");
      }

      // Verificar si ya tiene rol admin
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!existingRole) {
        // Eliminar roles anteriores del usuario
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Asignar rol admin
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "admin",
          });

        if (roleError) {
          console.error("setup-database: Role assignment error:", roleError);
          logs.push(`❌ Error asignando rol: ${roleError.message}`);
          throw roleError;
        }
        logs.push("✅ Rol admin asignado");
      } else {
        logs.push("ℹ️ Usuario ya es admin");
      }

      // Crear configuración de empresa si no existe
      const { data: existingCompany } = await supabaseAdmin
        .from("company_settings")
        .select("id")
        .limit(1);

      if (!existingCompany || existingCompany.length === 0) {
        const { error: companyError } = await supabaseAdmin
          .from("company_settings")
          .insert({
            name: "Mi Empresa",
            currency: "EUR",
            language: "es",
            timezone: "Europe/Madrid",
          });

        if (companyError) {
          logs.push(`⚠️ Aviso (empresa): ${companyError.message}`);
        } else {
          logs.push("✅ Configuración de empresa creada");
        }
      } else {
        logs.push("ℹ️ Configuración de empresa ya existe");
      }

      console.log("setup-database: Admin setup complete");
      return new Response(
        JSON.stringify({ success: true, logs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Acción no válida: ${action}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("setup-database: Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        logs: [`❌ Error: ${errorMessage}`],
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
