-- ============================================
-- CRM Schema para PostgreSQL Externo (Easypanel)
-- ============================================
-- Este archivo está diseñado para PostgreSQL EXTERNO
-- separado de Supabase. NO incluye:
-- - Triggers sobre auth.users (no existe en PG externo)
-- - Políticas RLS que dependen de auth.uid()
-- 
-- INSTRUCCIONES:
-- 1. Abre HeidiSQL y conéctate a tu PostgreSQL
-- 2. Copia y pega TODO este archivo
-- 3. Ejecuta (F9 o botón Ejecutar)
-- ============================================

-- ============================================
-- PARTE 1: EXTENSIONES NECESARIAS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PARTE 2: TIPOS ENUMERADOS
-- ============================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user', 'readonly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_status AS ENUM ('activo', 'inactivo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_segment AS ENUM ('corporativo', 'pyme', 'autonomo', 'particular');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('nuevo', 'contactado', 'seguimiento', 'descartado', 'convertido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('vigente', 'expirado', 'cancelado', 'pendiente_activacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing_period AS ENUM ('mensual', 'trimestral', 'anual', 'unico', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pagado', 'pendiente', 'parcial', 'reclamado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('borrador', 'enviado', 'aceptado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('borrador', 'emitida', 'pagada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE remittance_status AS ENUM ('pendiente', 'enviada', 'cobrada', 'parcial', 'devuelta', 'anulada', 'vencida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_status AS ENUM ('activo', 'inactivo', 'desarrollo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_importance AS ENUM ('alta', 'media', 'baja');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- PARTE 3: FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: TABLA DE VERSIONES
-- ============================================

-- Control de versiones del schema (para migraciones)
CREATE TABLE IF NOT EXISTS schema_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL UNIQUE,
  description text,
  applied_at timestamptz DEFAULT now(),
  applied_by text DEFAULT current_user
);

-- Funciones de versionado
CREATE OR REPLACE FUNCTION is_version_applied(p_version text)
RETURNS boolean
LANGUAGE sql
AS $$ SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = p_version); $$;

CREATE OR REPLACE FUNCTION get_current_schema_version()
RETURNS text
LANGUAGE sql
AS $$ SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1; $$;

-- ============================================
-- PARTE 4: TABLAS PRINCIPALES
-- ============================================

-- Usuarios del sistema (gestión propia, no Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  language text DEFAULT 'es',
  timezone text DEFAULT 'Europe/Madrid',
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Configuración de empresa
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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
  bic text,
  sepa_creditor_id text,
  currency text DEFAULT 'EUR',
  language text DEFAULT 'es',
  timezone text DEFAULT 'Europe/Madrid',
  date_format text DEFAULT 'DD/MM/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contactos (leads/prospectos)
CREATE SEQUENCE IF NOT EXISTS contacts_contact_number_seq;
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_number integer NOT NULL DEFAULT nextval('contacts_contact_number_seq'),
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'web',
  status contact_status DEFAULT 'new',
  meeting_date timestamptz,
  presentation_url text,
  quote_url text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clientes
CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;
CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_number integer NOT NULL DEFAULT nextval('clients_client_number_seq'),
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
  bic text,
  sepa_mandate_id text,
  sepa_mandate_date date,
  sepa_sequence_type text DEFAULT 'RCUR',
  segment client_segment DEFAULT 'pyme',
  status client_status DEFAULT 'active',
  source text,
  notes text,
  contact_id uuid REFERENCES contacts(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Servicios/Productos
CREATE SEQUENCE IF NOT EXISTS services_service_number_seq;
CREATE TABLE IF NOT EXISTS services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_number integer NOT NULL DEFAULT nextval('services_service_number_seq'),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  status service_status DEFAULT 'active',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Presupuestos
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number integer NOT NULL DEFAULT nextval('quotes_quote_number_seq'),
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
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Líneas de presupuesto
CREATE TABLE IF NOT EXISTS quote_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Contratos
CREATE SEQUENCE IF NOT EXISTS contracts_contract_number_seq;
CREATE TABLE IF NOT EXISTS contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number integer NOT NULL DEFAULT nextval('contracts_contract_number_seq'),
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
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Líneas de contrato
CREATE TABLE IF NOT EXISTS contract_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Remesas
CREATE SEQUENCE IF NOT EXISTS remittances_remittance_number_seq;
CREATE TABLE IF NOT EXISTS remittances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_number integer NOT NULL DEFAULT nextval('remittances_remittance_number_seq'),
  code text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  status remittance_status DEFAULT 'pending',
  total_amount numeric DEFAULT 0,
  invoice_count integer DEFAULT 0,
  collection_date date,
  sent_to_bank_at timestamptz,
  paid_amount numeric(12,2) DEFAULT 0,
  cancelled_at timestamptz,
  cancelled_reason text,
  notes text,
  xml_file_url text,
  n19_file_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pagos de remesa (v1.10.0)
CREATE TABLE IF NOT EXISTS remittance_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_id uuid NOT NULL REFERENCES remittances(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'cobrado' CHECK (status IN ('cobrado', 'devuelto', 'rechazado')),
  return_reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Facturas
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_number_seq;
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number integer NOT NULL DEFAULT nextval('invoices_invoice_number_seq'),
  client_id uuid NOT NULL REFERENCES clients(id),
  contract_id uuid REFERENCES contracts(id),
  remittance_id uuid REFERENCES remittances(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status invoice_status DEFAULT 'draft',
  subtotal numeric DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  iva_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  document_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Líneas de factura
CREATE TABLE IF NOT EXISTS invoice_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Gastos (v1.6.0: expense_number es text, id_factura añadido)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  supplier_cif text,
  invoice_number text,
  id_factura text,
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
  document_url text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
);

-- Campañas
CREATE SEQUENCE IF NOT EXISTS campaigns_campaign_number_seq;
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_number integer NOT NULL DEFAULT nextval('campaigns_campaign_number_seq'),
  name text NOT NULL,
  business_name text,
  email text,
  phone text,
  category text,
  address text,
  city text,
  province text,
  postal_code text,
  website text,
  place_id text,
  capture_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categorías de calendario
CREATE TABLE IF NOT EXISTS calendar_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  importance event_importance DEFAULT 'medium',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Eventos de calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  category_id uuid REFERENCES calendar_categories(id),
  importance event_importance DEFAULT 'medium',
  status text DEFAULT 'confirmed',
  notes text,
  reminder_minutes integer,
  recurrence_rule text,
  client_id uuid REFERENCES clients(id),
  contact_id uuid REFERENCES contacts(id),
  contract_id uuid REFERENCES contracts(id),
  google_event_id text,
  google_calendar_id text,
  is_synced_to_google boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Disponibilidad de usuario
CREATE TABLE IF NOT EXISTS user_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Configuración Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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

-- Configuración Email
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Configuración de PDF
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

-- Plantillas de email
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reglas de notificación
CREATE TABLE IF NOT EXISTS notification_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rule_type text NOT NULL,
  description text,
  days_threshold integer DEFAULT 3,
  is_active boolean DEFAULT true,
  template_id uuid REFERENCES email_templates(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cola de notificaciones
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  client_id uuid REFERENCES clients(id),
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Preferencias de notificación por cliente
CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, rule_type)
);

-- Plantillas de documentos
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  entity_type text NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '[]',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Configuración de entidades
CREATE TABLE IF NOT EXISTS entity_configurations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  icon text,
  fields jsonb NOT NULL DEFAULT '[]',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vistas de tabla personalizadas
CREATE TABLE IF NOT EXISTS user_table_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  view_name text NOT NULL,
  visible_columns jsonb NOT NULL DEFAULT '[]',
  column_order jsonb DEFAULT '[]',
  filters jsonb DEFAULT '{}',
  sort_config jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_name, view_name)
);

-- Tablas desnormalizadas para reportes
CREATE TABLE IF NOT EXISTS invoice_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS quote_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- ============================================
-- PARTE 5: TRIGGERS para updated_at
-- ============================================

CREATE OR REPLACE FUNCTION create_trigger_if_not_exists(
  trigger_name text,
  table_name text
) RETURNS void AS $$
BEGIN
  EXECUTE format('
    DROP TRIGGER IF EXISTS %I ON %I;
    CREATE TRIGGER %I
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  ', trigger_name, table_name, trigger_name, table_name);
END;
$$ LANGUAGE plpgsql;

SELECT create_trigger_if_not_exists('update_users_updated_at', 'users');
SELECT create_trigger_if_not_exists('update_company_settings_updated_at', 'company_settings');
SELECT create_trigger_if_not_exists('update_contacts_updated_at', 'contacts');
SELECT create_trigger_if_not_exists('update_clients_updated_at', 'clients');
SELECT create_trigger_if_not_exists('update_services_updated_at', 'services');
SELECT create_trigger_if_not_exists('update_quotes_updated_at', 'quotes');
SELECT create_trigger_if_not_exists('update_contracts_updated_at', 'contracts');
SELECT create_trigger_if_not_exists('update_invoices_updated_at', 'invoices');
SELECT create_trigger_if_not_exists('update_expenses_updated_at', 'expenses');
SELECT create_trigger_if_not_exists('update_campaigns_updated_at', 'campaigns');
SELECT create_trigger_if_not_exists('update_remittances_updated_at', 'remittances');
SELECT create_trigger_if_not_exists('update_calendar_categories_updated_at', 'calendar_categories');
SELECT create_trigger_if_not_exists('update_calendar_events_updated_at', 'calendar_events');

-- ============================================
-- PARTE 6: ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON clients(segment);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_remittance_id ON invoices(remittance_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_remittances_status ON remittances(status);
CREATE INDEX IF NOT EXISTS idx_remittances_collection_date ON remittances(collection_date);
CREATE INDEX IF NOT EXISTS idx_remittance_payments_remittance ON remittance_payments(remittance_id);
CREATE INDEX IF NOT EXISTS idx_remittance_payments_invoice ON remittance_payments(invoice_id);

-- ============================================
-- PARTE 7: DATOS INICIALES
-- ============================================

-- Empresa por defecto
INSERT INTO company_settings (name, currency, language, timezone, date_format, country)
SELECT 'Mi Empresa CRM', 'EUR', 'es', 'Europe/Madrid', 'DD/MM/YYYY', 'España'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

-- Servicios de ejemplo
INSERT INTO services (name, description, category, price, iva_percent, status)
SELECT 'Consultoría Estratégica', 'Sesión de consultoría estratégica empresarial', 'Consultoría', 150.00, 21.00, 'active'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Consultoría Estratégica');

INSERT INTO services (name, description, category, price, iva_percent, status)
SELECT 'Desarrollo Web', 'Desarrollo de página web corporativa', 'Desarrollo', 2500.00, 21.00, 'active'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Desarrollo Web');

INSERT INTO services (name, description, category, price, iva_percent, status)
SELECT 'Mantenimiento Web', 'Mantenimiento mensual de sitio web', 'Mantenimiento', 150.00, 21.00, 'active'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Mantenimiento Web');

INSERT INTO services (name, description, category, price, iva_percent, status)
SELECT 'SEO Mensual', 'Optimización SEO mensual', 'Marketing', 300.00, 21.00, 'active'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'SEO Mensual');

INSERT INTO services (name, description, category, price, iva_percent, status)
SELECT 'Gestión Redes Sociales', 'Community management mensual', 'Marketing', 400.00, 21.00, 'active'
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Gestión Redes Sociales');

-- Plantillas de email
INSERT INTO email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Factura Emitida', 'invoice_issued', 'Factura {{invoice_number}} - {{company_name}}',
'<div style="font-family: Arial, sans-serif;"><h2>Factura {{invoice_number}}</h2><p>Estimado/a {{client_name}},</p><p>Adjunto encontrará la factura por {{total}}€.</p></div>', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'invoice_issued');

INSERT INTO email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Recordatorio de Pago', 'payment_reminder', 'Recordatorio: Factura {{invoice_number}} pendiente',
'<div style="font-family: Arial, sans-serif;"><h2>Recordatorio de Pago</h2><p>La factura {{invoice_number}} está pendiente de pago.</p></div>', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'payment_reminder');

INSERT INTO email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Presupuesto Enviado', 'quote_sent', 'Presupuesto {{quote_number}} - {{company_name}}',
'<div style="font-family: Arial, sans-serif;"><h2>Presupuesto {{quote_number}}</h2><p>Adjunto el presupuesto solicitado por {{total}}€.</p></div>', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE template_type = 'quote_sent');

-- Reglas de notificación
INSERT INTO notification_rules (name, rule_type, description, days_threshold, is_active)
SELECT 'Recordatorio pre-vencimiento', 'invoice_due_soon', 'Enviar recordatorio antes del vencimiento', 3, true
WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE rule_type = 'invoice_due_soon');

INSERT INTO notification_rules (name, rule_type, description, days_threshold, is_active)
SELECT 'Factura vencida', 'invoice_overdue', 'Notificar facturas vencidas', 1, true
WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE rule_type = 'invoice_overdue');

INSERT INTO notification_rules (name, rule_type, description, days_threshold, is_active)
SELECT 'Próxima facturación', 'contract_billing_soon', 'Avisar de próxima facturación', 7, true
WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE rule_type = 'contract_billing_soon');

-- ============================================
-- PARTE 8: CREAR USUARIO ADMIN
-- ============================================
-- Cambia 'admin@tuempresa.com' y 'tu_password_seguro' por tus datos

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Verificar si ya existe un usuario admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@tuempresa.com') THEN
    INSERT INTO users (email, password_hash, full_name, is_active)
    VALUES (
      'admin@tuempresa.com',
      crypt('admin123', gen_salt('bf')),  -- CAMBIA ESTA CONTRASEÑA
      'Administrador',
      true
    )
    RETURNING id INTO admin_id;
    
    -- Asignar rol admin
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_id, 'admin');
    
    RAISE NOTICE 'Usuario admin creado: admin@tuempresa.com';
  ELSE
    RAISE NOTICE 'Usuario admin ya existe';
  END IF;
END $$;

-- Configuración PDF por defecto
INSERT INTO pdf_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);

-- Trigger para pdf_settings
DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
CREATE TRIGGER update_pdf_settings_updated_at
  BEFORE UPDATE ON pdf_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Registrar versiones del schema
INSERT INTO schema_versions (version, description, applied_at)
VALUES 
  ('v1.0.0', 'Schema base del CRM', now()),
  ('v1.1.0', 'PDF settings', now()),
  ('v1.2.0', 'Email signature', now()),
  ('v1.3.0', 'RLS schema_versions', now()),
  ('v1.4.0', 'is_sent/sent_at columns', now()),
  ('v1.5.0', 'Email logs, Gmail OAuth config', now()),
  ('v1.6.0', 'Expenses: expense_number text unique, id_factura', now()),
  ('v1.7.0', 'Enums en español', now()),
  ('v1.10.0', 'Mejoras remesas SEPA: campos, pagos, índices', now())
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- ✅ SCHEMA COMPLETO INSTALADO - v1.10.0
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CRM Schema v1.10.0 (PostgreSQL Externo)       ║';
  RAISE NOTICE '╠═══════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Tablas creadas: 31 (incluye remittance_payments) ║';
  RAISE NOTICE '║  Triggers: 14                                     ║';
  RAISE NOTICE '║  Índices: 21                                      ║';
  RAISE NOTICE '║  Datos iniciales: Sí                              ║';
  RAISE NOTICE '║  Usuario admin: admin@tuempresa.com / admin123    ║';
  RAISE NOTICE '║                                                   ║';
  RAISE NOTICE '║  v1.10.0: Mejoras remesas SEPA                    ║';
  RAISE NOTICE '║    • remittance_payments tabla                    ║';
  RAISE NOTICE '║    • clients: campos SEPA (bic, mandate)          ║';
  RAISE NOTICE '║    • company_settings: sepa_creditor_id, bic      ║';
  RAISE NOTICE '║    • remittances: campos adicionales              ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Cambia la contraseña del admin!';
  RAISE NOTICE '';
END $$;
END $$;
