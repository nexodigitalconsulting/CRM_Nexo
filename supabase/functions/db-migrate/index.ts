import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version - UPDATE THIS when adding new migrations
const CURRENT_VERSION = "v1.2.0";

// All migrations in order - Each migration MUST be idempotent
const MIGRATIONS: { version: string; description: string; sql: string }[] = [
  {
    version: "v1.0.0",
    description: "Schema base del CRM",
    sql: `-- Base schema marker - actual tables created by setup-database
          SELECT 'v1.0.0 base schema registered';`
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
        logo_position text DEFAULT 'left',
        show_iban_footer boolean DEFAULT true,
        show_notes boolean DEFAULT true,
        show_discounts_column boolean DEFAULT true,
        header_style text DEFAULT 'classic',
        font_size_base integer DEFAULT 10,
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
    description: "Columna signature_html, tablas de productos y triggers",
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
      
      -- Add is_sent column to quotes if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'quotes' 
          AND column_name = 'is_sent'
        ) THEN
          ALTER TABLE quotes ADD COLUMN is_sent boolean DEFAULT false;
          ALTER TABLE quotes ADD COLUMN sent_at timestamptz;
        END IF;
      END $$;
      
      -- Add is_sent column to contracts if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'contracts' 
          AND column_name = 'is_sent'
        ) THEN
          ALTER TABLE contracts ADD COLUMN is_sent boolean DEFAULT false;
          ALTER TABLE contracts ADD COLUMN sent_at timestamptz;
        END IF;
      END $$;
      
      -- Create invoice_products table if not exists
      CREATE TABLE IF NOT EXISTS invoice_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL,
        invoice_number integer NOT NULL,
        invoice_date date NOT NULL,
        invoice_status text,
        client_id uuid NOT NULL,
        client_name text NOT NULL,
        client_cif text,
        service_id uuid NOT NULL,
        service_name text NOT NULL,
        service_category text,
        quantity integer NOT NULL DEFAULT 1,
        unit_price numeric NOT NULL,
        discount_percent numeric DEFAULT 0,
        discount_amount numeric DEFAULT 0,
        subtotal numeric NOT NULL,
        iva_percent numeric DEFAULT 21,
        iva_amount numeric DEFAULT 0,
        total numeric NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      
      -- Create quote_products table if not exists
      CREATE TABLE IF NOT EXISTS quote_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id uuid NOT NULL,
        quote_number integer NOT NULL,
        quote_date date NOT NULL,
        quote_status text,
        client_id uuid,
        client_name text,
        contact_id uuid,
        contact_name text,
        service_id uuid NOT NULL,
        service_name text NOT NULL,
        service_category text,
        quantity integer NOT NULL DEFAULT 1,
        unit_price numeric NOT NULL,
        discount_percent numeric DEFAULT 0,
        discount_amount numeric DEFAULT 0,
        subtotal numeric NOT NULL,
        iva_percent numeric DEFAULT 21,
        iva_amount numeric DEFAULT 0,
        total numeric NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      
      -- Create sync_invoice_products function
      CREATE OR REPLACE FUNCTION sync_invoice_products()
      RETURNS trigger AS $$
      DECLARE
        inv_record RECORD;
        svc_record RECORD;
        cli_record RECORD;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          DELETE FROM invoice_products WHERE invoice_id = OLD.invoice_id AND service_id = OLD.service_id;
          RETURN OLD;
        END IF;

        SELECT * INTO inv_record FROM invoices WHERE id = NEW.invoice_id;
        SELECT * INTO svc_record FROM services WHERE id = NEW.service_id;
        SELECT * INTO cli_record FROM clients WHERE id = inv_record.client_id;

        INSERT INTO invoice_products (
          invoice_id, invoice_number, invoice_date, invoice_status,
          client_id, client_name, client_cif,
          service_id, service_name, service_category,
          quantity, unit_price, discount_percent, discount_amount,
          subtotal, iva_percent, iva_amount, total
        ) VALUES (
          NEW.invoice_id, inv_record.invoice_number, inv_record.issue_date, inv_record.status::text,
          inv_record.client_id, cli_record.name, cli_record.cif,
          NEW.service_id, svc_record.name, svc_record.category,
          NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
          NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
        )
        ON CONFLICT (id) DO UPDATE SET
          invoice_status = EXCLUDED.invoice_status,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          discount_percent = EXCLUDED.discount_percent,
          discount_amount = EXCLUDED.discount_amount,
          subtotal = EXCLUDED.subtotal,
          iva_percent = EXCLUDED.iva_percent,
          iva_amount = EXCLUDED.iva_amount,
          total = EXCLUDED.total,
          updated_at = now();

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create sync_quote_products function
      CREATE OR REPLACE FUNCTION sync_quote_products()
      RETURNS trigger AS $$
      DECLARE
        qt_record RECORD;
        svc_record RECORD;
        v_client_name text := NULL;
        v_contact_name text := NULL;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          DELETE FROM quote_products WHERE quote_id = OLD.quote_id AND service_id = OLD.service_id;
          RETURN OLD;
        END IF;

        SELECT * INTO qt_record FROM quotes WHERE id = NEW.quote_id;
        SELECT * INTO svc_record FROM services WHERE id = NEW.service_id;
        
        IF qt_record.client_id IS NOT NULL THEN
          SELECT name INTO v_client_name FROM clients WHERE id = qt_record.client_id;
        END IF;
        
        IF qt_record.contact_id IS NOT NULL THEN
          SELECT name INTO v_contact_name FROM contacts WHERE id = qt_record.contact_id;
        END IF;

        INSERT INTO quote_products (
          quote_id, quote_number, quote_date, quote_status,
          client_id, client_name, contact_id, contact_name,
          service_id, service_name, service_category,
          quantity, unit_price, discount_percent, discount_amount,
          subtotal, iva_percent, iva_amount, total
        ) VALUES (
          NEW.quote_id, qt_record.quote_number, qt_record.created_at::date, qt_record.status::text,
          qt_record.client_id, v_client_name, qt_record.contact_id, v_contact_name,
          NEW.service_id, svc_record.name, svc_record.category,
          NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
          NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
        )
        ON CONFLICT (id) DO UPDATE SET
          quote_status = EXCLUDED.quote_status,
          client_name = EXCLUDED.client_name,
          contact_name = EXCLUDED.contact_name,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          discount_percent = EXCLUDED.discount_percent,
          discount_amount = EXCLUDED.discount_amount,
          subtotal = EXCLUDED.subtotal,
          iva_percent = EXCLUDED.iva_percent,
          iva_amount = EXCLUDED.iva_amount,
          total = EXCLUDED.total,
          updated_at = now();

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create triggers (drop first to avoid errors)
      DROP TRIGGER IF EXISTS trg_sync_invoice_products ON invoice_services;
      DROP TRIGGER IF EXISTS trg_sync_quote_products ON quote_services;
      
      CREATE TRIGGER trg_sync_invoice_products
        AFTER INSERT OR UPDATE OR DELETE ON invoice_services
        FOR EACH ROW EXECUTE FUNCTION sync_invoice_products();
        
      CREATE TRIGGER trg_sync_quote_products
        AFTER INSERT OR UPDATE OR DELETE ON quote_services
        FOR EACH ROW EXECUTE FUNCTION sync_quote_products();
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_invoice_products_invoice_id ON invoice_products(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_products_client_id ON invoice_products(client_id);
      CREATE INDEX IF NOT EXISTS idx_quote_products_quote_id ON quote_products(quote_id);
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

    // ============================================
    // STEP 1: Verify base tables exist
    // ============================================
    const baseTablesCheck = await client.queryObject<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'user_roles', 'clients', 'invoices')
    `);
    
    if (baseTablesCheck.rows.length < 4) {
      logs.push("⚠ Tablas base no encontradas - ejecutar setup-database primero");
      await client.end();
      return new Response(JSON.stringify({
        success: false,
        error: "Base tables missing. Run setup-database first.",
        logs,
        requiresSetup: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    logs.push("✓ Tablas base verificadas");

    // ============================================
    // STEP 2: Check if schema_versions exists
    // ============================================
    const tableCheck = await client.queryObject<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_versions'
      ) as exists
    `);
    
    const schemaVersionsExists = tableCheck.rows[0]?.exists === true;
    logs.push(schemaVersionsExists ? "✓ Tabla schema_versions existe" : "⚠ Tabla schema_versions no existe");

    // ============================================
    // STEP 3: Create versioning system if not exists
    // ============================================
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

    // ============================================
    // STEP 4: Get current version (direct query)
    // ============================================
    const versionResult = await client.queryObject<{ version: string }>(`
      SELECT COALESCE(
        (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
        'v0.0.0'
      ) as version
    `);
    
    const currentVersion = versionResult.rows[0]?.version || "v0.0.0";
    logs.push(`📌 Versión actual: ${currentVersion}`);

    // ============================================
    // STEP 5: Determine pending migrations
    // ============================================
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

    // ============================================
    // STEP 6: Apply pending migrations
    // ============================================
    let appliedCount = 0;
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
        appliedCount++;
      } catch (migrationError: any) {
        logs.push(`  ⚠ Error en ${migration.version}: ${migrationError.message}`);
        // Continue with other migrations instead of stopping
      }
    }

    // ============================================
    // STEP 7: Verify final state
    // ============================================
    const finalVersionResult = await client.queryObject<{ version: string }>(`
      SELECT COALESCE(
        (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
        'v0.0.0'
      ) as version
    `);
    const finalVersion = finalVersionResult.rows[0]?.version || currentVersion;

    await client.end();
    logs.push(`✅ Migración completada: ${finalVersion} (${appliedCount} aplicadas)`);

    return new Response(JSON.stringify({
      success: true,
      currentVersion: finalVersion,
      targetVersion: CURRENT_VERSION,
      migrationsApplied: appliedCount,
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
