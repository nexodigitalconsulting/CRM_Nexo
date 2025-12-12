-- ============================================
-- 02. Schema completo del CRM
-- ============================================
-- Exportado automáticamente desde Supabase Cloud
-- Fecha: 2025-02-10

-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'readonly');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive');
CREATE TYPE public.client_segment AS ENUM ('corporate', 'pyme', 'entrepreneur', 'individual');
CREATE TYPE public.contact_status AS ENUM ('new', 'contacted', 'follow_up', 'discarded', 'converted');
CREATE TYPE public.contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_activation');
CREATE TYPE public.billing_period AS ENUM ('monthly', 'quarterly', 'annual', 'one_time', 'other');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'partial', 'claimed');
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');
CREATE TYPE public.remittance_status AS ENUM ('pending', 'paid', 'partial', 'overdue');
CREATE TYPE public.service_status AS ENUM ('active', 'inactive', 'development');
CREATE TYPE public.event_importance AS ENUM ('high', 'medium', 'low');

-- ============================================
-- FUNCIONES DE UTILIDAD
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Función para verificar cualquier rol
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TABLA: profiles
-- ============================================
CREATE TABLE public.profiles (
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

-- ============================================
-- TABLA: user_roles
-- ============================================
CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============================================
-- TABLA: company_settings
-- ============================================
CREATE TABLE public.company_settings (
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
  currency text DEFAULT 'EUR',
  language text DEFAULT 'es',
  timezone text DEFAULT 'Europe/Madrid',
  date_format text DEFAULT 'DD/MM/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: contacts
-- ============================================
CREATE SEQUENCE IF NOT EXISTS contacts_contact_number_seq;
CREATE TABLE public.contacts (
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
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: clients
-- ============================================
CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;
CREATE TABLE public.clients (
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
  segment client_segment DEFAULT 'pyme',
  status client_status DEFAULT 'active',
  source text,
  notes text,
  contact_id uuid REFERENCES public.contacts(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: services
-- ============================================
CREATE SEQUENCE IF NOT EXISTS services_service_number_seq;
CREATE TABLE public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_number integer NOT NULL DEFAULT nextval('services_service_number_seq'),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  status service_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: quotes
-- ============================================
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;
CREATE TABLE public.quotes (
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
  notes text,
  document_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: quote_services
-- ============================================
CREATE TABLE public.quote_services (
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

-- ============================================
-- TABLA: contracts
-- ============================================
CREATE SEQUENCE IF NOT EXISTS contracts_contract_number_seq;
CREATE TABLE public.contracts (
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
  notes text,
  document_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: contract_services
-- ============================================
CREATE TABLE public.contract_services (
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

-- ============================================
-- TABLA: remittances
-- ============================================
CREATE SEQUENCE IF NOT EXISTS remittances_remittance_number_seq;
CREATE TABLE public.remittances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_number integer NOT NULL DEFAULT nextval('remittances_remittance_number_seq'),
  code text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
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

-- ============================================
-- TABLA: invoices
-- ============================================
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_number_seq;
CREATE TABLE public.invoices (
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
  notes text,
  document_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: invoice_services
-- ============================================
CREATE TABLE public.invoice_services (
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

-- ============================================
-- TABLA: expenses
-- ============================================
CREATE SEQUENCE IF NOT EXISTS expenses_expense_number_seq;
CREATE TABLE public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number integer NOT NULL DEFAULT nextval('expenses_expense_number_seq'),
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
  document_url text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: campaigns
-- ============================================
CREATE SEQUENCE IF NOT EXISTS campaigns_campaign_number_seq;
CREATE TABLE public.campaigns (
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
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: calendar_categories
-- ============================================
CREATE TABLE public.calendar_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  importance event_importance DEFAULT 'medium',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: calendar_events
-- ============================================
CREATE TABLE public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
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

-- ============================================
-- TABLA: user_availability
-- ============================================
CREATE TABLE public.user_availability (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: google_calendar_config
-- ============================================
CREATE TABLE public.google_calendar_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- ============================================
-- TABLA: email_settings
-- ============================================
CREATE TABLE public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL,
  smtp_secure boolean DEFAULT true,
  from_email text NOT NULL,
  from_name text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: email_templates
-- ============================================
CREATE TABLE public.email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: notification_rules
-- ============================================
CREATE TABLE public.notification_rules (
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

-- ============================================
-- TABLA: notification_queue
-- ============================================
CREATE TABLE public.notification_queue (
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

-- ============================================
-- TABLA: client_notification_preferences
-- ============================================
CREATE TABLE public.client_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, rule_type)
);

-- ============================================
-- TABLA: document_templates
-- ============================================
CREATE TABLE public.document_templates (
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

-- ============================================
-- TABLA: entity_configurations
-- ============================================
CREATE TABLE public.entity_configurations (
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

-- ============================================
-- TABLA: user_table_views
-- ============================================
CREATE TABLE public.user_table_views (
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

-- ============================================
-- TABLA: documents_rag (para AI/Embeddings)
-- ============================================
CREATE TABLE public.documents_rag (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536)
);

-- ============================================
-- TABLAS DESNORMALIZADAS (para reportes)
-- ============================================

-- invoice_products
CREATE TABLE public.invoice_products (
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

-- quote_products
CREATE TABLE public.quote_products (
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

-- ============================================
-- TRIGGERS para updated_at
-- ============================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remittances_updated_at BEFORE UPDATE ON public.remittances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil de usuario automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ÍNDICES para rendimiento
-- ============================================

CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_segment ON public.clients(segment);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at DESC);

CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);

CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_next_billing ON public.contracts(next_billing_date);

CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_issue_date ON public.expenses(issue_date DESC);

CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_datetime);

CREATE INDEX idx_documents_rag_embedding ON public.documents_rag 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema CRM creado correctamente';
END $$;
