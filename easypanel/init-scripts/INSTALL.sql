-- ============================================
-- CRM Schema - INSTALADOR TODO EN UNO
-- ============================================
-- 
-- INSTRUCCIONES:
--   1. Abre Supabase SQL Editor
--   2. Copia y pega TODO este archivo
--   3. Ejecuta (F5)
--   4. ¡Listo!
--
-- Este script:
--   ✅ Detecta componentes existentes
--   ✅ Solo añade lo que falta
--   ✅ No borra datos existentes
--   ✅ Funciona en instalaciones nuevas y existentes
--
-- Versión: v1.6.0
-- ============================================

-- ============================================
-- PASO 1: TIPOS ENUMERADOS
-- ============================================

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'readonly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_segment AS ENUM ('corporate', 'pyme', 'entrepreneur', 'individual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contact_status AS ENUM ('new', 'contacted', 'follow_up', 'discarded', 'converted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_activation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.billing_period AS ENUM ('monthly', 'quarterly', 'annual', 'one_time', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'partial', 'claimed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.remittance_status AS ENUM ('pending', 'paid', 'partial', 'overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_status AS ENUM ('active', 'inactive', 'development'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.event_importance AS ENUM ('high', 'medium', 'low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

RAISE NOTICE '✓ Tipos enumerados OK';

-- ============================================
-- PASO 2: FUNCIÓN update_updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

RAISE NOTICE '✓ Función update_updated_at OK';

-- ============================================
-- PASO 3: TABLAS PRINCIPALES
-- ============================================

-- Schema versions (control de versiones)
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id serial PRIMARY KEY,
  version text NOT NULL UNIQUE,
  description text,
  applied_at timestamptz DEFAULT now(),
  applied_by text DEFAULT current_user
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Company settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cif text, address text, city text, province text, postal_code text,
  country text DEFAULT 'España',
  phone text, email text, website text, logo_url text, iban text,
  currency text DEFAULT 'EUR',
  language text DEFAULT 'es',
  timezone text DEFAULT 'Europe/Madrid',
  date_format text DEFAULT 'DD/MM/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contacts
CREATE SEQUENCE IF NOT EXISTS contacts_contact_number_seq;
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_number integer NOT NULL DEFAULT nextval('contacts_contact_number_seq'),
  name text NOT NULL,
  email text, phone text,
  source text DEFAULT 'web',
  status contact_status DEFAULT 'new',
  meeting_date timestamptz,
  presentation_url text, quote_url text, notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients
CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_number integer NOT NULL DEFAULT nextval('clients_client_number_seq'),
  name text NOT NULL,
  cif text, email text, phone text,
  address text, city text, province text, postal_code text,
  country text DEFAULT 'España',
  iban text,
  segment client_segment DEFAULT 'pyme',
  status client_status DEFAULT 'active',
  source text, notes text,
  contact_id uuid REFERENCES public.contacts(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Services
CREATE SEQUENCE IF NOT EXISTS services_service_number_seq;
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_number integer NOT NULL DEFAULT nextval('services_service_number_seq'),
  name text NOT NULL,
  description text, category text,
  price numeric NOT NULL DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  status service_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotes
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number integer NOT NULL DEFAULT nextval('quotes_quote_number_seq'),
  name text,
  client_id uuid REFERENCES public.clients(id),
  contact_id uuid REFERENCES public.contacts(id),
  status quote_status DEFAULT 'draft',
  valid_until date,
  subtotal numeric DEFAULT 0,
  iva_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text, document_url text,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quote services
CREATE TABLE IF NOT EXISTS public.quote_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
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

-- Contracts
CREATE SEQUENCE IF NOT EXISTS contracts_contract_number_seq;
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number integer NOT NULL DEFAULT nextval('contracts_contract_number_seq'),
  name text,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  quote_id uuid REFERENCES public.quotes(id),
  start_date date NOT NULL,
  end_date date,
  billing_period billing_period DEFAULT 'monthly',
  next_billing_date date,
  status contract_status DEFAULT 'pending_activation',
  payment_status payment_status DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  iva_total numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text, document_url text,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contract services
CREATE TABLE IF NOT EXISTS public.contract_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
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

-- Remittances
CREATE SEQUENCE IF NOT EXISTS remittances_remittance_number_seq;
CREATE TABLE IF NOT EXISTS public.remittances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_number integer NOT NULL DEFAULT nextval('remittances_remittance_number_seq'),
  code text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  status remittance_status DEFAULT 'pending',
  total_amount numeric DEFAULT 0,
  invoice_count integer DEFAULT 0,
  notes text,
  xml_file_url text, n19_file_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_number_seq;
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number integer NOT NULL DEFAULT nextval('invoices_invoice_number_seq'),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  contract_id uuid REFERENCES public.contracts(id),
  remittance_id uuid REFERENCES public.remittances(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status invoice_status DEFAULT 'draft',
  subtotal numeric DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  iva_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text, document_url text,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice services
CREATE TABLE IF NOT EXISTS public.invoice_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
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

-- Expenses (v1.6.0: expense_number es text, id_factura añadido)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  supplier_cif text, invoice_number text, id_factura text, concept text,
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
  document_url text, notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaigns
CREATE SEQUENCE IF NOT EXISTS campaigns_campaign_number_seq;
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_number integer NOT NULL DEFAULT nextval('campaigns_campaign_number_seq'),
  name text NOT NULL,
  business_name text, email text, phone text,
  category text, address text, city text, province text, postal_code text,
  website text, place_id text,
  capture_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendar categories
CREATE TABLE IF NOT EXISTS public.calendar_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  importance event_importance DEFAULT 'medium',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Calendar events
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text, location text,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  category_id uuid REFERENCES public.calendar_categories(id),
  importance event_importance DEFAULT 'medium',
  status text DEFAULT 'confirmed',
  notes text,
  reminder_minutes integer,
  recurrence_rule text,
  client_id uuid REFERENCES public.clients(id),
  contact_id uuid REFERENCES public.contacts(id),
  contract_id uuid REFERENCES public.contracts(id),
  google_event_id text,
  google_calendar_id text,
  is_synced_to_google boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User availability
CREATE TABLE IF NOT EXISTS public.user_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Google calendar config
CREATE TABLE IF NOT EXISTS public.google_calendar_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  access_token text, refresh_token text,
  token_expiry timestamptz,
  calendar_id text DEFAULT 'primary',
  sync_enabled boolean DEFAULT false,
  sync_direction text DEFAULT 'both',
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email settings
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL,
  smtp_secure boolean DEFAULT true,
  from_email text NOT NULL,
  from_name text,
  signature_html text,
  provider text DEFAULT 'smtp',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Gmail OAuth config (v1.5.0)
CREATE TABLE IF NOT EXISTS public.gmail_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  email_address text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email logs (v1.5.0)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  sender_email text NOT NULL,
  sender_name text,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body_preview text,
  entity_type text,
  entity_id uuid,
  provider text NOT NULL DEFAULT 'smtp',
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  attachments jsonb DEFAULT '[]',
  attachment_count integer DEFAULT 0,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- PDF settings
CREATE TABLE IF NOT EXISTS public.pdf_settings (
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

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rule_type text NOT NULL,
  description text,
  days_threshold integer DEFAULT 3,
  is_active boolean DEFAULT true,
  template_id uuid REFERENCES public.email_templates(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Client notification preferences
CREATE TABLE IF NOT EXISTS public.client_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, rule_type)
);

-- Document templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Entity configurations
CREATE TABLE IF NOT EXISTS public.entity_configurations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- User table views
CREATE TABLE IF NOT EXISTS public.user_table_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
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

-- Documents RAG (sin vector si no está disponible)
CREATE TABLE IF NOT EXISTS public.documents_rag (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding text
);

-- Invoice products (denormalized for reports)
CREATE TABLE IF NOT EXISTS public.invoice_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number integer NOT NULL,
  invoice_date date NOT NULL,
  invoice_status text,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  client_name text NOT NULL,
  client_cif text,
  service_id uuid NOT NULL REFERENCES public.services(id),
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

-- Quote products (denormalized for reports)
CREATE TABLE IF NOT EXISTS public.quote_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_number integer NOT NULL,
  quote_date date NOT NULL,
  quote_status text,
  client_id uuid REFERENCES public.clients(id),
  client_name text,
  contact_id uuid REFERENCES public.contacts(id),
  contact_name text,
  service_id uuid NOT NULL REFERENCES public.services(id),
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

RAISE NOTICE '✓ Tablas principales creadas';

-- ============================================
-- PASO 4: FUNCIONES AUXILIARES
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_schema_version()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1), 'v0.0.0');
$$;

CREATE OR REPLACE FUNCTION public.is_version_applied(check_version text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = check_version);
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(_user_id uuid, _email text, _full_name text DEFAULT 'Administrador')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_count int;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe un administrador');
  END IF;
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (_user_id, _email, _full_name)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message', 'Administrador creado');
END;
$$;

RAISE NOTICE '✓ Funciones auxiliares OK';

-- ============================================
-- PASO 5: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

RAISE NOTICE '✓ RLS habilitado en todas las tablas';

-- ============================================
-- PASO 6: POLÍTICAS RLS (DROP + CREATE)
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Company Settings
DROP POLICY IF EXISTS "Auth users can view company" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can manage company" ON public.company_settings;
CREATE POLICY "Auth users can view company" ON public.company_settings FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins can manage company" ON public.company_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Generic policies for business tables
DO $$ 
DECLARE
  tables text[] := ARRAY['contacts', 'clients', 'services', 'quotes', 'quote_services', 
    'contracts', 'contract_services', 'invoices', 'invoice_services', 
    'expenses', 'campaigns', 'remittances', 'invoice_products', 'quote_products'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth can view %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can manage %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Auth can view %s" ON public.%I FOR SELECT USING (has_any_role(auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "Users can manage %s" ON public.%I FOR ALL USING (has_any_role(auth.uid()))', t, t);
  END LOOP;
END $$;

-- Personal tables (user_id based)
DO $$
DECLARE
  tables text[] := ARRAY['calendar_categories', 'calendar_events', 'user_availability', 
    'google_calendar_config', 'user_table_views'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Own data %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Own data %s" ON public.%I FOR ALL USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- Open access tables (settings)
DO $$
DECLARE
  tables text[] := ARRAY['email_settings', 'email_templates', 'notification_rules', 
    'notification_queue', 'client_notification_preferences', 'pdf_settings',
    'document_templates', 'entity_configurations', 'documents_rag', 'schema_versions',
    'gmail_config'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Open %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Open %s" ON public.%I FOR ALL USING (true)', t, t);
  END LOOP;
END $$;

-- Email logs policies (v1.5.0)
DROP POLICY IF EXISTS "System can insert email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can view own email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can view all email_logs" ON public.email_logs;
CREATE POLICY "System can insert email_logs" ON public.email_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own email_logs" ON public.email_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all email_logs" ON public.email_logs FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

RAISE NOTICE '✓ Políticas RLS configuradas';

-- ============================================
-- PASO 7: TRIGGER USUARIO NUEVO
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '✓ Trigger usuario nuevo OK';

-- ============================================
-- PASO 8: ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON public.clients(segment);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_entity ON public.email_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

RAISE NOTICE '✓ Índices creados';

-- ============================================
-- PASO 9: DATOS INICIALES
-- ============================================

INSERT INTO public.company_settings (name, currency, language, timezone)
VALUES ('Mi Empresa CRM', 'EUR', 'es', 'Europe/Madrid')
ON CONFLICT DO NOTHING;

INSERT INTO public.pdf_settings (id) SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.pdf_settings LIMIT 1);

INSERT INTO public.schema_versions (version, description) VALUES 
  ('v1.0.0', 'Schema base'),
  ('v1.1.0', 'PDF settings'),
  ('v1.2.0', 'Email signature'),
  ('v1.3.0', 'RLS schema_versions'),
  ('v1.4.0', 'is_sent/sent_at columns'),
  ('v1.5.0', 'Email logs, Gmail OAuth config'),
  ('v1.6.0', 'Expenses: expense_number text unique, id_factura')
ON CONFLICT (version) DO NOTHING;

RAISE NOTICE '✓ Datos iniciales insertados';

-- ============================================
-- ✅ INSTALACIÓN COMPLETADA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ CRM Schema v1.6.0 - INSTALACIÓN COMPLETADA';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Nuevas características v1.6.0:';
  RAISE NOTICE '  • expenses.expense_number ahora es text (no secuencia)';
  RAISE NOTICE '  • expenses.expense_number tiene constraint UNIQUE';
  RAISE NOTICE '  • Nueva columna expenses.id_factura';
  RAISE NOTICE '';
  RAISE NOTICE 'SIGUIENTE PASO:';
  RAISE NOTICE '  1. Crea un usuario en Authentication → Users';
  RAISE NOTICE '  2. Ejecuta para hacerlo admin:';
  RAISE NOTICE '';
  RAISE NOTICE '     INSERT INTO user_roles (user_id, role)';
  RAISE NOTICE '     SELECT id, ''admin'' FROM auth.users';
  RAISE NOTICE '     WHERE email = ''tu@email.com'';';
  RAISE NOTICE '';
END $$;
