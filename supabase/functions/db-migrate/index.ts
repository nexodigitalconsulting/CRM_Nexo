import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version - UPDATE THIS when adding new migrations
const CURRENT_VERSION = "v1.2.0";

// All migrations in order
const MIGRATIONS: { version: string; description: string; sql: string }[] = [
  {
    version: "v1.0.0",
    description: "Schema base del CRM",
    sql: `-- Base schema is created by setup-database, just register version
          SELECT 'v1.0.0 is base schema';`
  },
  {
    version: "v1.1.0",
    description: "Tabla pdf_settings para personalización de documentos",
    sql: `
      -- Create pdf_settings table if not exists
      CREATE TABLE IF NOT EXISTS pdf_settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        primary_color text DEFAULT '#3366cc',
        secondary_color text DEFAULT '#666666',
        accent_color text DEFAULT '#0066cc',
        show_logo boolean DEFAULT true,
        logo_position text DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
        show_iban_footer boolean DEFAULT true,
        show_notes boolean DEFAULT true,
        show_discounts_column boolean DEFAULT true,
        header_style text DEFAULT 'classic' CHECK (header_style IN ('classic', 'modern', 'minimal')),
        font_size_base integer DEFAULT 10 CHECK (font_size_base BETWEEN 8 AND 14),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      
      -- Insert default if empty
      INSERT INTO pdf_settings (id)
      SELECT gen_random_uuid()
      WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);
    `
  },
  {
    version: "v1.2.0",
    description: "Columna signature_html en email_settings",
    sql: `
      -- Add signature_html column if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'email_settings' 
          AND column_name = 'signature_html'
        ) THEN
          ALTER TABLE email_settings ADD COLUMN signature_html text;
        END IF;
      END $$;
    `
  }
];

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  
  try {
    // Get postgres connection config from environment
    const host = Deno.env.get("EXTERNAL_POSTGRES_HOST");
    const port = parseInt(Deno.env.get("EXTERNAL_POSTGRES_PORT") || "5432");
    const database = Deno.env.get("EXTERNAL_POSTGRES_DB");
    const user = Deno.env.get("EXTERNAL_POSTGRES_USER");
    const password = Deno.env.get("EXTERNAL_POSTGRES_PASSWORD");

    if (!host || !database || !user || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: "External PostgreSQL not configured",
        logs: ["No external postgres configured, skipping migration"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logs.push("🔄 Iniciando verificación de migraciones...");
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    
    const client = new Client({
      hostname: host,
      port,
      database,
      user,
      password,
      tls: { enabled: false, enforce: false },
    });
    
    await client.connect();
    logs.push("✓ Conectado a PostgreSQL");

    // Step 1: Check if schema_versions table exists (WITHOUT using functions)
    const tableCheck = await client.queryObject<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_versions'
      ) as exists
    `);
    
    const schemaVersionsExists = tableCheck.rows[0]?.exists === true;
    logs.push(schemaVersionsExists ? "✓ Tabla schema_versions existe" : "⚠ Tabla schema_versions no existe");

    // Step 2: Create schema_versions if not exists
    if (!schemaVersionsExists) {
      logs.push("📦 Creando sistema de versionado...");
      
      await client.queryObject(`
        CREATE TABLE IF NOT EXISTS schema_versions (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          version text NOT NULL UNIQUE,
          description text,
          applied_at timestamptz DEFAULT now(),
          applied_by text DEFAULT current_user
        );
        
        -- Create helper functions
        CREATE OR REPLACE FUNCTION is_version_applied(p_version text)
        RETURNS boolean AS $$
          SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = p_version);
        $$ LANGUAGE sql STABLE;
        
        CREATE OR REPLACE FUNCTION get_current_schema_version()
        RETURNS text AS $$
          SELECT COALESCE(
            (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
            'v0.0.0'
          );
        $$ LANGUAGE sql STABLE;
      `);
      
      logs.push("✓ Sistema de versionado creado");
    }

    // Step 3: Get current version (using direct query, not function)
    const versionResult = await client.queryObject<{ version: string }>(`
      SELECT COALESCE(
        (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
        'v0.0.0'
      ) as version
    `);
    
    const currentVersion = versionResult.rows[0]?.version || "v0.0.0";
    logs.push(`📌 Versión actual: ${currentVersion}`);

    // Step 4: Determine which migrations to apply
    const appliedVersions = new Set<string>();
    const appliedResult = await client.queryObject<{ version: string }>(`
      SELECT version FROM schema_versions
    `);
    appliedResult.rows.forEach(row => appliedVersions.add(row.version));

    const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.has(m.version));
    
    if (pendingMigrations.length === 0) {
      logs.push(`✅ Base de datos actualizada (${currentVersion})`);
      await client.end();
      
      return new Response(JSON.stringify({
        success: true,
        currentVersion,
        targetVersion: CURRENT_VERSION,
        migrationsApplied: 0,
        logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logs.push(`🔄 Aplicando ${pendingMigrations.length} migraciones...`);

    // Step 5: Apply pending migrations
    for (const migration of pendingMigrations) {
      try {
        logs.push(`  → Aplicando ${migration.version}: ${migration.description}`);
        
        // Execute migration SQL
        await client.queryObject(migration.sql);
        
        // Register migration
        await client.queryObject(`
          INSERT INTO schema_versions (version, description, applied_at)
          VALUES ($1, $2, now())
          ON CONFLICT (version) DO NOTHING
        `, [migration.version, migration.description]);
        
        logs.push(`  ✓ ${migration.version} aplicada`);
      } catch (migrationError: any) {
        logs.push(`  ✗ Error en ${migration.version}: ${migrationError.message}`);
        // Continue with other migrations instead of stopping
      }
    }

    // Get final version
    const finalVersionResult = await client.queryObject<{ version: string }>(`
      SELECT COALESCE(
        (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
        'v0.0.0'
      ) as version
    `);
    const finalVersion = finalVersionResult.rows[0]?.version || currentVersion;

    await client.end();
    logs.push(`✅ Migración completada: ${finalVersion}`);

    return new Response(JSON.stringify({
      success: true,
      currentVersion: finalVersion,
      targetVersion: CURRENT_VERSION,
      migrationsApplied: pendingMigrations.length,
      logs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Migration error:", error);
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
