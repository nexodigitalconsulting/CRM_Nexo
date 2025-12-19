// Minimal Edge Function to verify the Edge runtime can start workers.
// Also provides environment info for hybrid architecture detection.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for environment indicators
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const externalPostgres = Deno.env.get("EXTERNAL_POSTGRES_HOST");
    
    // Determine environment type
    let environment: "lovable-cloud" | "self-hosted" | "hybrid" = "lovable-cloud";
    
    // Detect self-hosted: Easypanel uses .easypanel.host domains or custom domains
    // Also check for localhost, 127.0.0.1, or explicit SELF_HOSTED flag
    const isSelfHosted = 
      supabaseUrl.includes("easypanel") ||
      supabaseUrl.includes("localhost") ||
      supabaseUrl.includes("127.0.0.1") ||
      supabaseUrl.includes("self-hosted") ||
      Deno.env.get("SELF_HOSTED") === "true" ||
      Deno.env.get("EASYPANEL") === "true";
    
    if (externalPostgres) {
      environment = "hybrid"; // Using external Postgres with Lovable Edge Functions
    } else if (isSelfHosted) {
      environment = "self-hosted";
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        now: new Date().toISOString(),
        environment,
        capabilities: {
          edgeFunctions: true,
          dbMigrate: true,
          setupDatabase: true,
        },
        version: "1.5.0",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
