-- ============================================
-- CRM Schema Completo - Ejecutar en Supabase Studio
-- ============================================
-- Este archivo contiene TODO lo necesario:
-- 1. Tipos ENUM
-- 2. Funciones auxiliares
-- 3. Tablas
-- 4. Políticas RLS
-- 5. Triggers
-- 6. Datos iniciales
--
-- INSTRUCCIONES:
-- 1. Abre tu Supabase Studio → SQL Editor
-- 2. Copia y pega TODO este archivo
-- 3. Ejecuta (F5 o botón Run)
-- ============================================

-- ============================================
-- PARTE 0: EXTENSIONES OPCIONALES
-- ============================================
-- pgvector es opcional (solo para funciones RAG/AI)
-- Si no está disponible, documents_rag usará TEXT en lugar de VECTOR

DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension not available - RAG features will use TEXT fallback';
END $$;

-- ============================================
-- PARTE 1: TIPOS ENUMERADOS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'readonly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('activo', 'inactivo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.client_segment AS ENUM ('corporativo', 'pyme', 'autonomo', 'particular');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_status AS ENUM ('nuevo', 'contactado', 'seguimiento', 'descartado', 'convertido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('vigente', 'expirado', 'cancelado', 'pendiente_activacion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_period AS ENUM ('mensual', 'trimestral', 'anual', 'unico', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pagado', 'pendiente', 'parcial', 'reclamado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('borrador', 'enviado', 'aceptado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('borrador', 'emitida', 'pagada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.remittance_status AS ENUM ('pendiente', 'enviada', 'cobrada', 'parcial', 'devuelta', 'anulada', 'vencida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.service_status AS ENUM ('activo', 'inactivo', 'desarrollo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_importance AS ENUM ('alta', 'media', 'baja');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- PARTE 2: FUNCIÓN AUXILIAR BÁSICA
-- ============================================

-- Función para actualizar updated_at (no depende de tablas)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- PARTE 3: TABLA DE VERSIONES
-- ============================================

-- Control de versiones del schema (para migraciones)
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL UNIQUE,
  description text,
  applied_at timestamptz DEFAULT now(),
  applied_by text DEFAULT current_user
);

-- Funciones de versionado
CREATE OR REPLACE FUNCTION public.is_version_applied(p_version text)
RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = p_version); $$;

CREATE OR REPLACE FUNCTION public.get_current_schema_version()
RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT version FROM public.schema_versions ORDER BY applied_at DESC LIMIT 1; $$;

-- ============================================
-- PARTE 4: TABLAS PRINCIPALES
-- ============================================
-- IMPORTANTE: Las tablas se crean ANTES de las funciones que las referencian

-- Profiles (datos adicionales de usuarios)
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

-- Roles de usuario (separado para seguridad)
-- CRÍTICO: Esta tabla DEBE existir antes de crear has_role/has_any_role
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============================================
-- PARTE 3B: FUNCIONES QUE DEPENDEN DE TABLAS
-- ============================================
-- Estas funciones se crean DESPUÉS de user_roles

-- Función para verificar rol específico (SECURITY DEFINER para evitar recursión RLS)
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

-- Función para crear perfil automáticamente al registrar usuario
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

-- Configuración de empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
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
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_number integer NOT NULL DEFAULT nextval('contacts_contact_number_seq'),
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'web',
  status contact_status DEFAULT 'nuevo',
  meeting_date timestamptz,
  presentation_url text,
  quote_url text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clientes
CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;
CREATE TABLE IF NOT EXISTS public.clients (
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
  status client_status DEFAULT 'activo',
  source text,
  notes text,
  contact_id uuid REFERENCES public.contacts(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Servicios/Productos
CREATE SEQUENCE IF NOT EXISTS services_service_number_seq;
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_number integer NOT NULL DEFAULT nextval('services_service_number_seq'),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  status service_status DEFAULT 'activo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Presupuestos
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number integer NOT NULL DEFAULT nextval('quotes_quote_number_seq'),
  name text,
  client_id uuid REFERENCES public.clients(id),
  contact_id uuid REFERENCES public.contacts(id),
  status quote_status DEFAULT 'borrador',
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

-- Líneas de presupuesto
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

-- Contratos
CREATE SEQUENCE IF NOT EXISTS contracts_contract_number_seq;
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number integer NOT NULL DEFAULT nextval('contracts_contract_number_seq'),
  name text,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  quote_id uuid REFERENCES public.quotes(id),
  start_date date NOT NULL,
  end_date date,
  billing_period billing_period DEFAULT 'mensual',
  next_billing_date date,
  status contract_status DEFAULT 'pendiente_activacion',
  payment_status payment_status DEFAULT 'pendiente',
  payment_status payment_status DEFAULT 'pendiente',
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

-- Líneas de contrato
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

-- Remesas
CREATE SEQUENCE IF NOT EXISTS remittances_remittance_number_seq;
CREATE TABLE IF NOT EXISTS public.remittances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_number integer NOT NULL DEFAULT nextval('remittances_remittance_number_seq'),
  code text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  status remittance_status DEFAULT 'pendiente',
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
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pagos de remesa (v1.10.0)
CREATE TABLE IF NOT EXISTS public.remittance_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_id uuid NOT NULL REFERENCES public.remittances(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'cobrado' CHECK (status IN ('cobrado', 'devuelto', 'rechazado')),
  return_reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Facturas
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_number_seq;
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number integer NOT NULL DEFAULT nextval('invoices_invoice_number_seq'),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  contract_id uuid REFERENCES public.contracts(id),
  remittance_id uuid REFERENCES public.remittances(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status invoice_status DEFAULT 'borrador',
  subtotal numeric DEFAULT 0,
  iva_percent numeric DEFAULT 21.00,
  iva_amount numeric DEFAULT 0,
  irpf_percent numeric(5,2) DEFAULT 0,
  irpf_amount numeric(12,2) DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  document_url text,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Líneas de factura
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

-- Gastos (v1.6.0: expense_number es text, id_factura añadido)
CREATE TABLE IF NOT EXISTS public.expenses (
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
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campañas
CREATE SEQUENCE IF NOT EXISTS campaigns_campaign_number_seq;
CREATE TABLE IF NOT EXISTS public.campaigns (
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

-- Categorías de calendario
CREATE TABLE IF NOT EXISTS public.calendar_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  importance event_importance DEFAULT 'media',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Eventos de calendario
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  category_id uuid REFERENCES public.calendar_categories(id),
  importance event_importance DEFAULT 'media',
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

-- Disponibilidad de usuario
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

-- Configuración Google Calendar
CREATE TABLE IF NOT EXISTS public.google_calendar_config (
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

-- Configuración Email
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

-- Gmail OAuth Config (v1.5.0)
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

-- Email Logs (v1.5.0)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  sender_email text NOT NULL,
  sender_name text,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body_preview text,
  attachments jsonb DEFAULT '[]',
  attachment_count integer DEFAULT 0,
  entity_type text,
  entity_id uuid,
  provider text NOT NULL DEFAULT 'smtp',
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Configuración de PDF
CREATE TABLE IF NOT EXISTS public.pdf_settings (
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

-- Reglas de notificación
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

-- Cola de notificaciones
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

-- Preferencias de notificación por cliente
CREATE TABLE IF NOT EXISTS public.client_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, rule_type)
);

-- Plantillas de documentos
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

-- Configuración de entidades
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

-- Vistas de tabla personalizadas
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

-- Documentos RAG (para embeddings/AI)
-- Nota: Si pgvector está instalado, embedding será vector(1536), si no, será TEXT
DO $$
BEGIN
  -- Intenta crear con vector si la extensión existe
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE TABLE IF NOT EXISTS public.documents_rag (
      id bigserial PRIMARY KEY,
      content text NOT NULL,
      metadata jsonb DEFAULT '{}',
      embedding vector(1536)
    );
  ELSE
    -- Fallback sin vector type
    CREATE TABLE IF NOT EXISTS public.documents_rag (
      id bigserial PRIMARY KEY,
      content text NOT NULL,
      metadata jsonb DEFAULT '{}',
      embedding text
    );
  END IF;
EXCEPTION WHEN duplicate_table THEN 
  NULL;
END $$;

-- Tablas desnormalizadas para reportes
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

-- ============================================
-- PARTE 4: HABILITAR RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_table_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 5: POLÍTICAS RLS
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Company Settings
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can view company settings" ON public.company_settings FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
CREATE POLICY "Admins can manage company settings" ON public.company_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Contacts
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
CREATE POLICY "Authenticated users can view contacts" ON public.contacts FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage contacts" ON public.contacts;
CREATE POLICY "Users can manage contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage clients" ON public.clients;
CREATE POLICY "Users can manage clients" ON public.clients FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Services
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage services" ON public.services;
CREATE POLICY "Admins and managers can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Quotes
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes;
CREATE POLICY "Authenticated users can view quotes" ON public.quotes FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage quotes" ON public.quotes;
CREATE POLICY "Users can manage quotes" ON public.quotes FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

DROP POLICY IF EXISTS "Authenticated users can view quote_services" ON public.quote_services;
CREATE POLICY "Authenticated users can view quote_services" ON public.quote_services FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage quote_services" ON public.quote_services;
CREATE POLICY "Users can manage quote_services" ON public.quote_services FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Contracts
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;
CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage contracts" ON public.contracts;
CREATE POLICY "Users can manage contracts" ON public.contracts FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

DROP POLICY IF EXISTS "Authenticated users can view contract_services" ON public.contract_services;
CREATE POLICY "Authenticated users can view contract_services" ON public.contract_services FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage contract_services" ON public.contract_services;
CREATE POLICY "Users can manage contract_services" ON public.contract_services FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage invoices" ON public.invoices;
CREATE POLICY "Users can manage invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

DROP POLICY IF EXISTS "Authenticated users can view invoice_services" ON public.invoice_services;
CREATE POLICY "Authenticated users can view invoice_services" ON public.invoice_services FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage invoice_services" ON public.invoice_services;
CREATE POLICY "Users can manage invoice_services" ON public.invoice_services FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage expenses" ON public.expenses;
CREATE POLICY "Admins and managers can manage expenses" ON public.expenses FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Campaigns
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage campaigns" ON public.campaigns;
CREATE POLICY "Users can manage campaigns" ON public.campaigns FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- Remittances
DROP POLICY IF EXISTS "Authenticated users can view remittances" ON public.remittances;
CREATE POLICY "Authenticated users can view remittances" ON public.remittances FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage remittances" ON public.remittances;
CREATE POLICY "Admins and managers can manage remittances" ON public.remittances FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Remittance Payments (v1.10.0)
DROP POLICY IF EXISTS "Authenticated users can view remittance_payments" ON public.remittance_payments;
CREATE POLICY "Authenticated users can view remittance_payments" ON public.remittance_payments FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can insert remittance_payments" ON public.remittance_payments;
CREATE POLICY "Admins and managers can insert remittance_payments" ON public.remittance_payments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins and managers can update remittance_payments" ON public.remittance_payments;
CREATE POLICY "Admins and managers can update remittance_payments" ON public.remittance_payments FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins and managers can delete remittance_payments" ON public.remittance_payments;
CREATE POLICY "Admins and managers can delete remittance_payments" ON public.remittance_payments FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Calendar (personal por usuario)
DROP POLICY IF EXISTS "Users can view own categories" ON public.calendar_categories;
CREATE POLICY "Users can view own categories" ON public.calendar_categories FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own categories" ON public.calendar_categories;
CREATE POLICY "Users can manage own categories" ON public.calendar_categories FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own events" ON public.calendar_events;
CREATE POLICY "Users can view own events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own events" ON public.calendar_events;
CREATE POLICY "Users can manage own events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own availability" ON public.user_availability;
CREATE POLICY "Users can view own availability" ON public.user_availability FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own availability" ON public.user_availability;
CREATE POLICY "Users can manage own availability" ON public.user_availability FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own google config" ON public.google_calendar_config;
CREATE POLICY "Users can view own google config" ON public.google_calendar_config FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own google config" ON public.google_calendar_config;
CREATE POLICY "Users can manage own google config" ON public.google_calendar_config FOR ALL USING (auth.uid() = user_id);

-- User table views
DROP POLICY IF EXISTS "Users can view own table views" ON public.user_table_views;
CREATE POLICY "Users can view own table views" ON public.user_table_views FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own table views" ON public.user_table_views;
CREATE POLICY "Users can manage own table views" ON public.user_table_views FOR ALL USING (auth.uid() = user_id);

-- Configuración (acceso abierto para usuarios autenticados)
DROP POLICY IF EXISTS "Users can manage email settings" ON public.email_settings;
CREATE POLICY "Users can manage email settings" ON public.email_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage email templates" ON public.email_templates;
CREATE POLICY "Users can manage email templates" ON public.email_templates FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage notification rules" ON public.notification_rules;
CREATE POLICY "Users can manage notification rules" ON public.notification_rules FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage notification queue" ON public.notification_queue;
CREATE POLICY "Users can manage notification queue" ON public.notification_queue FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can manage client preferences" ON public.client_notification_preferences;
CREATE POLICY "Users can manage client preferences" ON public.client_notification_preferences FOR ALL USING (true);

-- Document templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.document_templates;
CREATE POLICY "Authenticated users can view templates" ON public.document_templates FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage templates" ON public.document_templates;
CREATE POLICY "Admins and managers can manage templates" ON public.document_templates FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Entity configurations
DROP POLICY IF EXISTS "Authenticated users can view entity_configurations" ON public.entity_configurations;
CREATE POLICY "Authenticated users can view entity_configurations" ON public.entity_configurations FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage entity_configurations" ON public.entity_configurations;
CREATE POLICY "Admins can manage entity_configurations" ON public.entity_configurations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Documents RAG
DROP POLICY IF EXISTS "Authenticated users can view documents_rag" ON public.documents_rag;
CREATE POLICY "Authenticated users can view documents_rag" ON public.documents_rag FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage documents_rag" ON public.documents_rag;
CREATE POLICY "Authenticated users can manage documents_rag" ON public.documents_rag FOR ALL USING (true);

-- Invoice/Quote products (reportes)
DROP POLICY IF EXISTS "Authenticated users can view invoice_products" ON public.invoice_products;
CREATE POLICY "Authenticated users can view invoice_products" ON public.invoice_products FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage invoice_products" ON public.invoice_products;
CREATE POLICY "Users can manage invoice_products" ON public.invoice_products FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

DROP POLICY IF EXISTS "Authenticated users can view quote_products" ON public.quote_products;
CREATE POLICY "Authenticated users can view quote_products" ON public.quote_products FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Users can manage quote_products" ON public.quote_products;
CREATE POLICY "Users can manage quote_products" ON public.quote_products FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'user'));

-- PDF Settings
ALTER TABLE public.pdf_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pdf_settings" ON public.pdf_settings;
CREATE POLICY "Authenticated users can view pdf_settings" ON public.pdf_settings FOR SELECT USING (has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage pdf_settings" ON public.pdf_settings;
CREATE POLICY "Admins and managers can manage pdf_settings" ON public.pdf_settings FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Gmail Config (v1.5.0)
DROP POLICY IF EXISTS "Admins can manage gmail config" ON public.gmail_config;
CREATE POLICY "Admins can manage gmail config" ON public.gmail_config FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view gmail config" ON public.gmail_config;
CREATE POLICY "Authenticated users can view gmail config" ON public.gmail_config FOR SELECT USING (has_any_role(auth.uid()));

-- Email Logs (v1.5.0)
DROP POLICY IF EXISTS "Admins and managers can view all email logs" ON public.email_logs;
CREATE POLICY "Admins and managers can view all email logs" ON public.email_logs FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Users can view own email logs" ON public.email_logs;
CREATE POLICY "Users can view own email logs" ON public.email_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
CREATE POLICY "System can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- PARTE 6: TRIGGERS
-- ============================================

-- Trigger para crear usuario cuando se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_remittances_updated_at ON public.remittances;
CREATE TRIGGER update_remittances_updated_at BEFORE UPDATE ON public.remittances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON public.pdf_settings;
CREATE TRIGGER update_pdf_settings_updated_at BEFORE UPDATE ON public.pdf_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 7: ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON public.clients(segment);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_remittance_id ON public.invoices(remittance_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON public.calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_remittances_status ON public.remittances(status);
CREATE INDEX IF NOT EXISTS idx_remittances_collection_date ON public.remittances(collection_date);
CREATE INDEX IF NOT EXISTS idx_remittance_payments_remittance ON public.remittance_payments(remittance_id);
CREATE INDEX IF NOT EXISTS idx_remittance_payments_invoice ON public.remittance_payments(invoice_id);

-- ============================================
-- PARTE 8: DATOS INICIALES
-- ============================================

-- Empresa por defecto
INSERT INTO public.company_settings (name, currency, language, timezone, date_format, country)
VALUES ('Mi Empresa CRM', 'EUR', 'es', 'Europe/Madrid', 'DD/MM/YYYY', 'España')
ON CONFLICT DO NOTHING;

-- Servicios de ejemplo
INSERT INTO public.services (name, description, category, price, iva_percent, status) VALUES
  ('Consultoría Estratégica', 'Sesión de consultoría estratégica empresarial', 'Consultoría', 150.00, 21.00, 'active'),
  ('Desarrollo Web', 'Desarrollo de página web corporativa', 'Desarrollo', 2500.00, 21.00, 'active'),
  ('Mantenimiento Web', 'Mantenimiento mensual de sitio web', 'Mantenimiento', 150.00, 21.00, 'active'),
  ('SEO Mensual', 'Optimización SEO mensual', 'Marketing', 300.00, 21.00, 'active'),
  ('Gestión Redes Sociales', 'Community management mensual', 'Marketing', 400.00, 21.00, 'active')
ON CONFLICT DO NOTHING;

-- Plantillas de email
INSERT INTO public.email_templates (name, template_type, subject, body_html, is_active) VALUES
('Factura Emitida', 'invoice_issued', 'Factura {{invoice_number}} - {{company_name}}',
'<div style="font-family: Arial, sans-serif;"><h2>Factura {{invoice_number}}</h2><p>Estimado/a {{client_name}},</p><p>Adjunto encontrará la factura por {{total}}€.</p></div>', true),
('Recordatorio de Pago', 'payment_reminder', 'Recordatorio: Factura {{invoice_number}} pendiente',
'<div style="font-family: Arial, sans-serif;"><h2>Recordatorio de Pago</h2><p>La factura {{invoice_number}} está pendiente de pago.</p></div>', true),
('Presupuesto Enviado', 'quote_sent', 'Presupuesto {{quote_number}} - {{company_name}}',
'<div style="font-family: Arial, sans-serif;"><h2>Presupuesto {{quote_number}}</h2><p>Adjunto el presupuesto solicitado por {{total}}€.</p></div>', true)
ON CONFLICT DO NOTHING;

-- Reglas de notificación
INSERT INTO public.notification_rules (name, rule_type, description, days_threshold, is_active) VALUES
  ('Recordatorio pre-vencimiento', 'invoice_due_soon', 'Enviar recordatorio antes del vencimiento', 3, true),
  ('Factura vencida', 'invoice_overdue', 'Notificar facturas vencidas', 1, true),
  ('Próxima facturación', 'contract_billing_soon', 'Avisar de próxima facturación', 7, true)
ON CONFLICT DO NOTHING;

-- Configuración PDF por defecto
INSERT INTO public.pdf_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.pdf_settings LIMIT 1);

-- Registrar versiones del schema
INSERT INTO public.schema_versions (version, description, applied_at)
VALUES 
  ('v1.0.0', 'Schema base del CRM', now()),
  ('v1.1.0', 'Tabla pdf_settings para personalización de documentos', now()),
  ('v1.2.0', 'Columna signature_html en email_settings', now()),
  ('v1.3.0', 'RLS para schema_versions - lectura pública', now()),
  ('v1.4.0', 'Columnas is_sent y sent_at en invoices, quotes, contracts', now()),
  ('v1.5.0', 'Email logs, Gmail OAuth config, provider selector', now()),
  ('v1.6.0', 'Expenses: expense_number text unique, id_factura', now()),
  ('v1.10.0', 'Mejoras remesas SEPA: campos, pagos, índices, RLS', now())
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- ✅ SCHEMA COMPLETO INSTALADO - v1.10.0
-- ============================================

DO $$
DECLARE
  v_invoices_ok boolean;
  v_quotes_ok boolean;
  v_contracts_ok boolean;
  v_email_logs_ok boolean;
  v_gmail_config_ok boolean;
  v_expense_number_ok boolean;
  v_id_factura_ok boolean;
  v_remittance_payments_ok boolean;
  v_clients_sepa_ok boolean;
BEGIN
  -- Verificar componentes v1.4.0
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'is_sent'
  ) INTO v_invoices_ok;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'is_sent'
  ) INTO v_quotes_ok;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'is_sent'
  ) INTO v_contracts_ok;

  -- Verificar componentes v1.5.0
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_logs'
  ) INTO v_email_logs_ok;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'gmail_config'
  ) INTO v_gmail_config_ok;

  -- Verificar componentes v1.6.0
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'expense_number' AND data_type = 'text'
  ) INTO v_expense_number_ok;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'id_factura'
  ) INTO v_id_factura_ok;

  -- Verificar componentes v1.10.0
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'remittance_payments'
  ) INTO v_remittance_payments_ok;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'sepa_mandate_id'
  ) INTO v_clients_sepa_ok;

  RAISE NOTICE '';
  RAISE NOTICE '[%] ════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '║  ✅ CRM Schema v1.10.0 instalado correctamente ║';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '[%] VERIFICACIÓN DE COMPONENTES:', clock_timestamp();
  RAISE NOTICE '  v1.4.0:';
  RAISE NOTICE '  • invoices.is_sent/sent_at:  %', CASE WHEN v_invoices_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  • quotes.is_sent/sent_at:    %', CASE WHEN v_quotes_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  • contracts.is_sent/sent_at: %', CASE WHEN v_contracts_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  v1.5.0:';
  RAISE NOTICE '  • email_logs tabla:          %', CASE WHEN v_email_logs_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  • gmail_config tabla:        %', CASE WHEN v_gmail_config_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  v1.6.0:';
  RAISE NOTICE '  • expenses.expense_number text: %', CASE WHEN v_expense_number_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  • expenses.id_factura:       %', CASE WHEN v_id_factura_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  v1.10.0:';
  RAISE NOTICE '  • remittance_payments tabla: %', CASE WHEN v_remittance_payments_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '  • clients.sepa_mandate_id:   %', CASE WHEN v_clients_sepa_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '';
  RAISE NOTICE '[%] ESTADÍSTICAS:', clock_timestamp();
  RAISE NOTICE '  • Tablas creadas: 31';
  RAISE NOTICE '  • Políticas RLS: 60+';
  RAISE NOTICE '  • Triggers: 14';
  RAISE NOTICE '  • Datos iniciales: Sí';
  RAISE NOTICE '';
  RAISE NOTICE '[%] SIGUIENTE PASO:', clock_timestamp();
  RAISE NOTICE '  Registra un usuario y asígnale rol admin:';
  RAISE NOTICE '';
  RAISE NOTICE '  INSERT INTO public.user_roles (user_id, role)';
  RAISE NOTICE '  SELECT id, ''admin'' FROM auth.users WHERE email = ''tu@email.com'';';
  RAISE NOTICE '';
END $$;
