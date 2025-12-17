import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current schema version
const CURRENT_VERSION = "v1.2.0";

// Pool de conexiones simulado para Postgres externo
async function connectExternalPostgres(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): Promise<{ success: boolean; error?: string; version?: string }> {
  try {
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    
    const client = new Client({
      hostname: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      tls: { enabled: false, enforce: false },
    });
    
    await client.connect();
    const result = await client.queryObject("SELECT version()");
    await client.end();
    
    const version = (result.rows[0] as any)?.version || "PostgreSQL";
    return { success: true, version };
  } catch (error: any) {
    console.error("Postgres connection error:", error);
    return { success: false, error: error.message };
  }
}

// Crear todas las tablas del CRM en Postgres externo
async function createCRMSchema(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): Promise<{ success: boolean; logs: string[]; error?: string }> {
  const logs: string[] = [];
  
  try {
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    
    const client = new Client({
      hostname: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      tls: { enabled: false, enforce: false },
    });
    
    await client.connect();
    logs.push("✓ Conectado a PostgreSQL");

    // ============================================
    // SISTEMA DE VERSIONADO (CREAR PRIMERO)
    // ============================================
    logs.push("Creando sistema de versionado...");
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

    // ============================================
    // CREAR ENUMs
    // ============================================
    logs.push("Creando tipos ENUM...");
    const enums = `
      DO $$ BEGIN
        CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user', 'readonly');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE client_status AS ENUM ('active', 'inactive');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE client_segment AS ENUM ('corporate', 'pyme', 'entrepreneur', 'individual');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE contact_status AS ENUM ('new', 'contacted', 'follow_up', 'discarded', 'converted');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_activation');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE billing_period AS ENUM ('monthly', 'quarterly', 'annual', 'one_time', 'other');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial', 'claimed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE service_status AS ENUM ('active', 'inactive', 'development');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE remittance_status AS ENUM ('pending', 'paid', 'partial', 'overdue');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      DO $$ BEGIN
        CREATE TYPE event_importance AS ENUM ('high', 'medium', 'low');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `;
    await client.queryObject(enums);
    logs.push("✓ Tipos ENUM creados");

    // ============================================
    // FUNCIONES DE UTILIDAD
    // ============================================
    logs.push("Creando funciones...");
    await client.queryObject(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    logs.push("✓ Función update_updated_at creada");

    // ============================================
    // TABLAS PRINCIPALES
    // ============================================
    logs.push("Creando tablas...");
    
    // Profiles
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        email text NOT NULL,
        full_name text,
        avatar_url text,
        phone text,
        language text DEFAULT 'es',
        timezone text DEFAULT 'Europe/Madrid',
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla profiles");

    // User roles
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        role app_role NOT NULL DEFAULT 'user',
        created_at timestamptz DEFAULT now(),
        UNIQUE(user_id, role)
      );
    `);
    logs.push("✓ Tabla user_roles");

    // Company settings
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        cif text,
        address text,
        city text,
        province text,
        postal_code text,
        country text DEFAULT 'España',
        phone text,
        email text,
        website text,
        logo_url text,
        iban text,
        currency text DEFAULT 'EUR',
        language text DEFAULT 'es',
        timezone text DEFAULT 'Europe/Madrid',
        date_format text DEFAULT 'DD/MM/YYYY',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla company_settings");

    // Contacts
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_number serial,
        name text NOT NULL,
        email text,
        phone text,
        source text DEFAULT 'web',
        status contact_status DEFAULT 'new',
        meeting_date timestamptz,
        presentation_url text,
        quote_url text,
        notes text,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla contacts");

    // Clients
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_number serial,
        name text NOT NULL,
        cif text,
        email text,
        phone text,
        address text,
        city text,
        province text,
        postal_code text,
        country text DEFAULT 'España',
        iban text,
        segment client_segment DEFAULT 'pyme',
        status client_status DEFAULT 'active',
        source text,
        notes text,
        contact_id uuid REFERENCES contacts(id),
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla clients");

    // Services
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_number serial,
        name text NOT NULL,
        description text,
        category text,
        price numeric NOT NULL DEFAULT 0,
        iva_percent numeric DEFAULT 21.00,
        status service_status DEFAULT 'active',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla services");

    // Quotes
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS quotes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_number serial,
        name text,
        client_id uuid REFERENCES clients(id),
        contact_id uuid REFERENCES contacts(id),
        status quote_status DEFAULT 'draft',
        valid_until date,
        subtotal numeric DEFAULT 0,
        iva_total numeric DEFAULT 0,
        total numeric DEFAULT 0,
        notes text,
        document_url text,
        is_sent boolean DEFAULT false,
        sent_at timestamptz,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla quotes");

    // Quote services
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS quote_services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        service_id uuid NOT NULL REFERENCES services(id),
        quantity integer DEFAULT 1,
        unit_price numeric NOT NULL,
        discount_percent numeric DEFAULT 0,
        discount_amount numeric DEFAULT 0,
        subtotal numeric NOT NULL,
        iva_percent numeric DEFAULT 21.00,
        iva_amount numeric DEFAULT 0,
        total numeric NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla quote_services");

    // Contracts
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_number serial,
        name text,
        client_id uuid NOT NULL REFERENCES clients(id),
        quote_id uuid REFERENCES quotes(id),
        start_date date NOT NULL,
        end_date date,
        billing_period billing_period DEFAULT 'monthly',
        next_billing_date date,
        status contract_status DEFAULT 'pending_activation',
        payment_status payment_status DEFAULT 'pending',
        subtotal numeric DEFAULT 0,
        iva_total numeric DEFAULT 0,
        total numeric DEFAULT 0,
        notes text,
        document_url text,
        is_sent boolean DEFAULT false,
        sent_at timestamptz,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla contracts");

    // Contract services
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS contract_services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        service_id uuid NOT NULL REFERENCES services(id),
        quantity integer DEFAULT 1,
        unit_price numeric NOT NULL,
        discount_percent numeric DEFAULT 0,
        discount_amount numeric DEFAULT 0,
        subtotal numeric NOT NULL,
        iva_percent numeric DEFAULT 21.00,
        iva_amount numeric DEFAULT 0,
        total numeric NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla contract_services");

    // Invoices
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number serial,
        client_id uuid NOT NULL REFERENCES clients(id),
        contract_id uuid REFERENCES contracts(id),
        issue_date date DEFAULT CURRENT_DATE,
        due_date date,
        status invoice_status DEFAULT 'draft',
        subtotal numeric DEFAULT 0,
        iva_percent numeric DEFAULT 21.00,
        iva_amount numeric DEFAULT 0,
        total numeric DEFAULT 0,
        notes text,
        document_url text,
        is_sent boolean DEFAULT false,
        sent_at timestamptz,
        remittance_id uuid,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla invoices");

    // Invoice services
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS invoice_services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        service_id uuid NOT NULL REFERENCES services(id),
        description text,
        quantity integer DEFAULT 1,
        unit_price numeric NOT NULL,
        discount_percent numeric DEFAULT 0,
        discount_amount numeric DEFAULT 0,
        subtotal numeric NOT NULL,
        iva_percent numeric DEFAULT 21.00,
        iva_amount numeric DEFAULT 0,
        total numeric NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla invoice_services");

    // Expenses
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_number serial,
        supplier_name text NOT NULL,
        supplier_cif text,
        invoice_number text,
        concept text,
        issue_date date NOT NULL,
        due_date date,
        subtotal numeric DEFAULT 0,
        iva_percent numeric DEFAULT 21.00,
        iva_amount numeric DEFAULT 0,
        irpf_percent numeric DEFAULT 0,
        irpf_amount numeric DEFAULT 0,
        total numeric DEFAULT 0,
        currency text DEFAULT 'EUR',
        status text DEFAULT 'pending',
        notes text,
        document_url text,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla expenses");

    // Remittances
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS remittances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        remittance_number serial,
        code text,
        issue_date date DEFAULT CURRENT_DATE,
        status remittance_status DEFAULT 'pending',
        total_amount numeric DEFAULT 0,
        invoice_count integer DEFAULT 0,
        notes text,
        xml_file_url text,
        n19_file_url text,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla remittances");

    // Campaigns
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_number serial,
        name text NOT NULL,
        business_name text,
        email text,
        phone text,
        website text,
        category text,
        address text,
        city text,
        province text,
        postal_code text,
        place_id text,
        capture_date date DEFAULT CURRENT_DATE,
        status text DEFAULT 'active',
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla campaigns");

    // Calendar categories
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS calendar_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name text NOT NULL,
        color text NOT NULL DEFAULT '#3b82f6',
        importance event_importance DEFAULT 'medium',
        is_default boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla calendar_categories");

    // Calendar events
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        title text NOT NULL,
        description text,
        start_datetime timestamptz NOT NULL,
        end_datetime timestamptz NOT NULL,
        all_day boolean DEFAULT false,
        location text,
        category_id uuid REFERENCES calendar_categories(id),
        importance event_importance DEFAULT 'medium',
        status text DEFAULT 'confirmed',
        notes text,
        recurrence_rule text,
        reminder_minutes integer,
        client_id uuid REFERENCES clients(id),
        contact_id uuid REFERENCES contacts(id),
        contract_id uuid REFERENCES contracts(id),
        google_event_id text,
        google_calendar_id text,
        is_synced_to_google boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla calendar_events");

    // User availability
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS user_availability (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        day_of_week integer NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        is_available boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla user_availability");

    // Email settings (con signature_html)
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        smtp_host text NOT NULL,
        smtp_port integer NOT NULL DEFAULT 587,
        smtp_user text NOT NULL,
        smtp_password text NOT NULL,
        smtp_secure boolean DEFAULT true,
        from_email text NOT NULL,
        from_name text,
        signature_html text,
        is_active boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla email_settings (con signature_html)");

    // Email templates
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        template_type text NOT NULL,
        subject text NOT NULL,
        body_html text NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla email_templates");

    // Notification rules
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS notification_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        rule_type text NOT NULL,
        description text,
        days_threshold integer DEFAULT 3,
        is_active boolean DEFAULT true,
        template_id uuid REFERENCES email_templates(id),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla notification_rules");

    // Notification queue
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        client_id uuid REFERENCES clients(id),
        rule_type text NOT NULL,
        status text DEFAULT 'pending',
        sent_at timestamptz,
        error_message text,
        created_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla notification_queue");

    // Client notification preferences
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS client_notification_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id uuid NOT NULL REFERENCES clients(id),
        rule_type text NOT NULL,
        is_enabled boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(client_id, rule_type)
      );
    `);
    logs.push("✓ Tabla client_notification_preferences");

    // Document templates
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        entity_type text NOT NULL,
        content text NOT NULL,
        variables jsonb DEFAULT '[]',
        is_default boolean DEFAULT false,
        is_active boolean DEFAULT true,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla document_templates");

    // Entity configurations
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS entity_configurations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_name text NOT NULL UNIQUE,
        display_name text NOT NULL,
        icon text,
        fields jsonb NOT NULL DEFAULT '[]',
        is_system boolean DEFAULT false,
        is_active boolean DEFAULT true,
        created_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla entity_configurations");

    // User table views
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS user_table_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        entity_name text NOT NULL,
        view_name text NOT NULL,
        visible_columns jsonb NOT NULL DEFAULT '[]',
        column_order jsonb DEFAULT '[]',
        filters jsonb DEFAULT '{}',
        sort_config jsonb DEFAULT '{}',
        is_default boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla user_table_views");

    // Google calendar config
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS google_calendar_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        access_token text,
        refresh_token text,
        token_expiry timestamptz,
        calendar_id text DEFAULT 'primary',
        sync_enabled boolean DEFAULT false,
        sync_direction text DEFAULT 'both',
        last_sync_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    logs.push("✓ Tabla google_calendar_config");

    // ============================================
    // PDF SETTINGS (v1.1.0)
    // ============================================
    await client.queryObject(`
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
    `);
    logs.push("✓ Tabla pdf_settings");

    // ============================================
    // INVOICE PRODUCTS (tabla desnormalizada para reportes)
    // ============================================
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS invoice_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        invoice_number integer NOT NULL,
        invoice_date date NOT NULL,
        invoice_status text,
        client_id uuid NOT NULL REFERENCES clients(id),
        client_name text NOT NULL,
        client_cif text,
        service_id uuid NOT NULL REFERENCES services(id),
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
    `);
    logs.push("✓ Tabla invoice_products");

    // ============================================
    // QUOTE PRODUCTS (tabla desnormalizada para reportes)
    // ============================================
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS quote_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        quote_number integer NOT NULL,
        quote_date date NOT NULL,
        quote_status text,
        client_id uuid REFERENCES clients(id),
        client_name text,
        contact_id uuid REFERENCES contacts(id),
        contact_name text,
        service_id uuid NOT NULL REFERENCES services(id),
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
    `);
    logs.push("✓ Tabla quote_products");

    // ============================================
    // DOCUMENTS RAG (para funcionalidad IA)
    // ============================================
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS documents_rag (
        id bigserial PRIMARY KEY,
        content text NOT NULL,
        metadata jsonb DEFAULT '{}',
        embedding vector(1536)
      );
    `);
    logs.push("✓ Tabla documents_rag");

    // ============================================
    // FUNCIONES DE SINCRONIZACIÓN
    // ============================================
    logs.push("Creando funciones de sincronización...");
    
    // sync_invoice_products
    await client.queryObject(`
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
    `);
    logs.push("✓ Función sync_invoice_products");

    // sync_quote_products
    await client.queryObject(`
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
    `);
    logs.push("✓ Función sync_quote_products");

    // ============================================
    // TRIGGERS
    // ============================================
    logs.push("Creando triggers...");
    
    await client.queryObject(`
      DROP TRIGGER IF EXISTS trg_sync_invoice_products ON invoice_services;
      CREATE TRIGGER trg_sync_invoice_products
        AFTER INSERT OR UPDATE OR DELETE ON invoice_services
        FOR EACH ROW EXECUTE FUNCTION sync_invoice_products();
        
      DROP TRIGGER IF EXISTS trg_sync_quote_products ON quote_services;
      CREATE TRIGGER trg_sync_quote_products
        AFTER INSERT OR UPDATE OR DELETE ON quote_services
        FOR EACH ROW EXECUTE FUNCTION sync_quote_products();
    `);
    logs.push("✓ Triggers de sincronización creados");

    // ============================================
    // FUNCIONES DE ROLES
    // ============================================
    await client.queryObject(`
      CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
      RETURNS boolean AS $$
        SELECT EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = _user_id AND role = _role
        );
      $$ LANGUAGE sql STABLE SECURITY DEFINER;
      
      CREATE OR REPLACE FUNCTION has_any_role(_user_id uuid)
      RETURNS boolean AS $$
        SELECT EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = _user_id
        );
      $$ LANGUAGE sql STABLE SECURITY DEFINER;
    `);
    logs.push("✓ Funciones de roles creadas");

    // ============================================
    // FK Y CONSTRAINTS ADICIONALES
    // ============================================
    await client.queryObject(`
      DO $$ BEGIN
        ALTER TABLE invoices ADD CONSTRAINT fk_invoice_remittance 
          FOREIGN KEY (remittance_id) REFERENCES remittances(id);
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // ============================================
    // ÍNDICES
    // ============================================
    logs.push("Creando índices...");
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
      CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
      CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_datetime, end_datetime);
      CREATE INDEX IF NOT EXISTS idx_invoice_products_invoice_id ON invoice_products(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_products_client_id ON invoice_products(client_id);
      CREATE INDEX IF NOT EXISTS idx_quote_products_quote_id ON quote_products(quote_id);
    `);
    logs.push("✓ Índices creados");

    // ============================================
    // REGISTRAR VERSIÓN
    // ============================================
    await client.queryObject(`
      INSERT INTO schema_versions (version, description)
      VALUES ('${CURRENT_VERSION}', 'Schema completo del CRM con todas las tablas y funciones')
      ON CONFLICT (version) DO NOTHING;
    `);
    logs.push(`✓ Versión ${CURRENT_VERSION} registrada`);

    await client.end();
    logs.push("✅ Schema del CRM creado correctamente");
    
    return { success: true, logs };
  } catch (error: any) {
    console.error("Error creating schema:", error);
    logs.push(`❌ Error: ${error.message}`);
    return { success: false, logs, error: error.message };
  }
}

serve(async (req) => {
  console.log("setup-database: Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    console.log("setup-database: Action:", action);

    const logs: string[] = [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // ============================================
    // ACTION: test-postgres
    // ============================================
    if (action === "test-postgres") {
      const { host, port, database, user, password } = body.postgres;
      
      logs.push(`Conectando a ${host}:${port}/${database}...`);
      
      const result = await connectExternalPostgres({
        host,
        port: parseInt(port) || 5432,
        database,
        user,
        password,
      });

      if (result.success) {
        logs.push(`✓ Conexión exitosa`);
        logs.push(`✓ ${result.version?.substring(0, 50)}...`);
        return new Response(
          JSON.stringify({ success: true, logs, version: result.version }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        logs.push(`❌ Error: ${result.error}`);
        return new Response(
          JSON.stringify({ success: false, logs, error: result.error }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================
    // ACTION: test-supabase
    // ============================================
    if (action === "test-supabase") {
      if (!supabaseUrl || !serviceRoleKey) {
        logs.push("❌ Variables de entorno de Supabase no configuradas");
        return new Response(
          JSON.stringify({
            success: false,
            logs,
            error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas en el servidor",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logs.push(`✓ SUPABASE_URL: ${supabaseUrl.substring(0, 40)}...`);
      logs.push(`✓ SERVICE_ROLE_KEY: ***${serviceRoleKey.slice(-8)}`);

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
      
      if (error) {
        logs.push(`❌ Error accediendo a Supabase Auth: ${error.message}`);
        return new Response(
          JSON.stringify({ success: false, logs, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logs.push("✓ Conexión a Supabase Auth OK");
      return new Response(
        JSON.stringify({ success: true, logs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACTION: create-schema
    // ============================================
    if (action === "create-schema") {
      const { host, port, database, user, password } = body.postgres;
      
      logs.push("Iniciando creación del schema del CRM...");
      
      const result = await createCRMSchema({
        host,
        port: parseInt(port) || 5432,
        database,
        user,
        password,
      });

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          logs: [...logs, ...result.logs], 
          error: result.error 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACTION: create-admin
    // ============================================
    if (action === "create-admin") {
      const { userId, email, fullName, postgres } = body;

      if (!userId) {
        throw new Error("userId es requerido");
      }

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Variables de Supabase no configuradas en el servidor");
      }

      logs.push(`Configurando admin para ${email}...`);

      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      
      const client = new Client({
        hostname: postgres.host,
        port: parseInt(postgres.port) || 5432,
        database: postgres.database,
        user: postgres.user,
        password: postgres.password,
        tls: { enabled: false, enforce: false },
      });
      
      await client.connect();

      const existing = await client.queryObject(
        "SELECT id FROM profiles WHERE user_id = $1",
        [userId]
      );

      if (existing.rows.length === 0) {
        await client.queryObject(
          `INSERT INTO profiles (user_id, email, full_name) VALUES ($1, $2, $3)`,
          [userId, email, fullName || "Administrador"]
        );
        logs.push("✓ Perfil creado");
      } else {
        logs.push("ℹ️ Perfil ya existe");
      }

      await client.queryObject("DELETE FROM user_roles WHERE user_id = $1", [userId]);
      await client.queryObject(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin')",
        [userId]
      );
      logs.push("✓ Rol admin asignado");

      const companyExists = await client.queryObject("SELECT id FROM company_settings LIMIT 1");
      if (companyExists.rows.length === 0) {
        await client.queryObject(`
          INSERT INTO company_settings (name, currency, language, timezone) 
          VALUES ('Mi Empresa', 'EUR', 'es', 'Europe/Madrid')
        `);
        logs.push("✓ Configuración de empresa creada");
      } else {
        logs.push("ℹ️ Configuración de empresa ya existe");
      }

      await client.end();
      logs.push("✅ Administrador configurado correctamente");

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
