-- ============================================
-- 03. Row Level Security (RLS) Policies
-- ============================================
-- Políticas de seguridad a nivel de fila

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
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

-- ============================================
-- POLÍTICAS: profiles
-- ============================================

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- POLÍTICAS: user_roles
-- ============================================

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- POLÍTICAS: company_settings
-- ============================================

CREATE POLICY "Authenticated users can view company settings" ON public.company_settings
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage company settings" ON public.company_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- POLÍTICAS: contacts
-- ============================================

CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage contacts" ON public.contacts
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: clients
-- ============================================

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage clients" ON public.clients
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: services
-- ============================================

CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage services" ON public.services
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- ============================================
-- POLÍTICAS: quotes y quote_services
-- ============================================

CREATE POLICY "Authenticated users can view quotes" ON public.quotes
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage quotes" ON public.quotes
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

CREATE POLICY "Authenticated users can view quote_services" ON public.quote_services
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage quote_services" ON public.quote_services
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: contracts y contract_services
-- ============================================

CREATE POLICY "Authenticated users can view contracts" ON public.contracts
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage contracts" ON public.contracts
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

CREATE POLICY "Authenticated users can view contract_services" ON public.contract_services
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage contract_services" ON public.contract_services
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: invoices y invoice_services
-- ============================================

CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoices" ON public.invoices
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

CREATE POLICY "Authenticated users can view invoice_services" ON public.invoice_services
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoice_services" ON public.invoice_services
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: expenses
-- ============================================

CREATE POLICY "Authenticated users can view expenses" ON public.expenses
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage expenses" ON public.expenses
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- ============================================
-- POLÍTICAS: campaigns
-- ============================================

CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage campaigns" ON public.campaigns
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- POLÍTICAS: remittances
-- ============================================

CREATE POLICY "Authenticated users can view remittances" ON public.remittances
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage remittances" ON public.remittances
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- ============================================
-- POLÍTICAS: calendar (por usuario)
-- ============================================

CREATE POLICY "Users can view own categories" ON public.calendar_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON public.calendar_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own events" ON public.calendar_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own availability" ON public.user_availability
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own availability" ON public.user_availability
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own google config" ON public.google_calendar_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own google config" ON public.google_calendar_config
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: configuración (admin/sistema)
-- ============================================

CREATE POLICY "Users can manage email settings" ON public.email_settings
  FOR ALL USING (true);

CREATE POLICY "Users can manage email templates" ON public.email_templates
  FOR ALL USING (true);

CREATE POLICY "Users can manage notification rules" ON public.notification_rules
  FOR ALL USING (true);

CREATE POLICY "Users can manage notification queue" ON public.notification_queue
  FOR ALL USING (true);

CREATE POLICY "Users can manage client preferences" ON public.client_notification_preferences
  FOR ALL USING (true);

-- ============================================
-- POLÍTICAS: templates y configuración
-- ============================================

CREATE POLICY "Authenticated users can view templates" ON public.document_templates
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage templates" ON public.document_templates
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Authenticated users can view entity_configurations" ON public.entity_configurations
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage entity_configurations" ON public.entity_configurations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- POLÍTICAS: user_table_views
-- ============================================

CREATE POLICY "Users can view own table views" ON public.user_table_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own table views" ON public.user_table_views
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: documents_rag
-- ============================================

CREATE POLICY "Authenticated users can view documents_rag" ON public.documents_rag
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage documents_rag" ON public.documents_rag
  FOR ALL USING (true);

-- ============================================
-- POLÍTICAS: tablas desnormalizadas
-- ============================================

CREATE POLICY "Authenticated users can view invoice_products" ON public.invoice_products
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoice_products" ON public.invoice_products
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

CREATE POLICY "Authenticated users can view quote_products" ON public.quote_products
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage quote_products" ON public.quote_products
  FOR ALL USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'user')
  );

-- ============================================
-- FIN DE POLÍTICAS RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS creadas correctamente';
END $$;
