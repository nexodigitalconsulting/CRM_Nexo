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
    
    if (externalPostgres) {
      environment = "hybrid"; // Using external Postgres with Lovable Edge Functions
    } else if (supabaseUrl.includes("localhost") || supabaseUrl.includes("self-hosted")) {
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
        version: "1.2.0",
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
