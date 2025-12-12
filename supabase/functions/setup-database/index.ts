import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, email, fullName } = await req.json();

    // Crear cliente con service_role para operaciones admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const logs: string[] = [];

    if (action === "init") {
      logs.push("Verificando conexión a base de datos...");

      // Verificar si ya existen las tablas
      const { data: existingTables } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(1);

      if (existingTables !== null) {
        logs.push("Las tablas ya existen en la base de datos");
        return new Response(
          JSON.stringify({ success: true, logs, message: "Schema ya existe" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Si no existen, retornar instrucciones
      logs.push("⚠️ Las tablas no existen.");
      logs.push("Por favor ejecuta el archivo SQL manualmente:");
      logs.push("1. Ve a Supabase Studio → SQL Editor");
      logs.push("2. Ejecuta: easypanel/init-scripts/full-schema.sql");

      return new Response(
        JSON.stringify({
          success: false,
          logs,
          error: "Ejecuta el schema SQL manualmente en Supabase Studio",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-admin") {
      if (!userId) {
        throw new Error("userId es requerido");
      }

      logs.push(`Configurando admin para usuario ${userId}...`);

      // Verificar si ya existe el perfil
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

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
          logs.push(`Error creando perfil: ${profileError.message}`);
          throw profileError;
        }
        logs.push("Perfil creado");
      } else {
        logs.push("Perfil ya existe");
      }

      // Verificar si ya tiene rol admin
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

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
          logs.push(`Error asignando rol: ${roleError.message}`);
          throw roleError;
        }
        logs.push("Rol admin asignado");
      } else {
        logs.push("Usuario ya es admin");
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
          logs.push(`Aviso: ${companyError.message}`);
        } else {
          logs.push("Configuración de empresa creada");
        }
      }

      return new Response(
        JSON.stringify({ success: true, logs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Acción no válida");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en setup-database:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        logs: [`Error: ${errorMessage}`],
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
