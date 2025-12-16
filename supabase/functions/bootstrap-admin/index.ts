import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName } = await req.json();

    // Validate required fields
    if (!email || !password) {
      console.error("Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email y contraseña son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase incompleta en el servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Checking if any admin exists...");

    // SECURITY: Only allow if NO admin exists (first setup only)
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      console.error("Error checking existing admins:", checkError);
      return new Response(
        JSON.stringify({ error: `Error verificando admins: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log("Admin already exists, rejecting bootstrap");
      return new Response(
        JSON.stringify({ error: "Ya existe un administrador. Inicia sesión en /auth" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("No admin exists, proceeding with bootstrap for:", email);

    // Try to find existing user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log("User already exists, using existing user:", existingUser.id);
      userId = existingUser.id;
      
      // Update password and confirm email
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      });
      if (updateError) {
        console.error("Error updating user:", updateError);
        // Non-fatal, continue
      }
    } else {
      console.log("Creating new user...");
      // Create new user with admin client (bypasses email confirmation)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "Administrador" },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Error creando usuario: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("User created with ID:", userId);
    }

    // Ensure profile exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: email,
        full_name: fullName || "Administrador",
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Non-fatal, continue
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "admin",
      }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Error assigning admin role:", roleError);
      return new Response(
        JSON.stringify({ error: `Error asignando rol admin: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin bootstrap completed successfully for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Administrador creado correctamente",
        userId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ error: `Error inesperado: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
