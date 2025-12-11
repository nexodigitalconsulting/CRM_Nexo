-- Email SMTP settings
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  smtp_secure BOOLEAN DEFAULT true,
  from_email TEXT NOT NULL,
  from_name TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL, -- 'invoice_send', 'invoice_due_reminder', 'invoice_overdue', 'contract_pending', 'contract_expiring', 'quote_followup'
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification rules configuration
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL UNIQUE, -- 'invoice_due_3days', 'invoice_overdue', 'contract_pending', 'contract_expiring', 'quote_no_response'
  name TEXT NOT NULL,
  description TEXT,
  days_threshold INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  template_id UUID REFERENCES public.email_templates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Per-client notification preferences
CREATE TABLE public.client_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, rule_type)
);

-- Notification queue for tracking sent notifications
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'invoice', 'contract', 'quote'
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can manage)
CREATE POLICY "Users can manage email settings" ON public.email_settings FOR ALL USING (true);
CREATE POLICY "Users can manage email templates" ON public.email_templates FOR ALL USING (true);
CREATE POLICY "Users can manage notification rules" ON public.notification_rules FOR ALL USING (true);
CREATE POLICY "Users can manage client preferences" ON public.client_notification_preferences FOR ALL USING (true);
CREATE POLICY "Users can manage notification queue" ON public.notification_queue FOR ALL USING (true);

-- Insert default templates
INSERT INTO public.email_templates (template_type, name, subject, body_html) VALUES
('invoice_send', 'Envío de Factura', 'Factura {{invoice_number}} - {{company_name}}', '<h2>Factura {{invoice_number}}</h2><p>Estimado/a {{client_name}},</p><p>Adjuntamos la factura {{invoice_number}} por importe de {{total}}€.</p><p>Fecha de vencimiento: {{due_date}}</p><p>Atentamente,<br>{{company_name}}</p>'),
('invoice_due_reminder', 'Recordatorio Vencimiento', 'Recordatorio: Factura {{invoice_number}} vence en {{days}} días', '<h2>Recordatorio de Vencimiento</h2><p>Estimado/a {{client_name}},</p><p>Le recordamos que la factura {{invoice_number}} por importe de {{total}}€ vence el {{due_date}}.</p><p>Atentamente,<br>{{company_name}}</p>'),
('invoice_overdue', 'Factura Vencida', 'Aviso: Factura {{invoice_number}} vencida hace {{days}} días', '<h2>Factura Vencida</h2><p>Estimado/a {{client_name}},</p><p>La factura {{invoice_number}} por importe de {{total}}€ venció el {{due_date}}.</p><p>Por favor, realice el pago a la mayor brevedad.</p><p>Atentamente,<br>{{company_name}}</p>'),
('contract_pending', 'Contrato Pendiente de Firma', 'Contrato {{contract_number}} pendiente de firma', '<h2>Contrato Pendiente</h2><p>Estimado/a {{client_name}},</p><p>El contrato {{contract_number}} está pendiente de firma.</p><p>Por favor, revíselo y fírmelo a la mayor brevedad.</p><p>Atentamente,<br>{{company_name}}</p>'),
('contract_expiring', 'Renovación de Contrato', 'Su contrato {{contract_number}} vence en {{days}} días', '<h2>Renovación de Contrato</h2><p>Estimado/a {{client_name}},</p><p>El contrato {{contract_number}} vence el {{end_date}}.</p><p>Contacte con nosotros para renovarlo.</p><p>Atentamente,<br>{{company_name}}</p>'),
('quote_followup', 'Seguimiento Presupuesto', 'Seguimiento: Presupuesto {{quote_number}}', '<h2>Seguimiento de Presupuesto</h2><p>Estimado/a {{client_name}},</p><p>Hace {{days}} días le enviamos el presupuesto {{quote_number}}.</p><p>¿Ha tenido oportunidad de revisarlo? Estamos a su disposición.</p><p>Atentamente,<br>{{company_name}}</p>');

-- Insert default notification rules
INSERT INTO public.notification_rules (rule_type, name, description, days_threshold) VALUES
('invoice_due_3days', 'Facturas por vencer', 'Enviar recordatorio 3 días antes del vencimiento', 3),
('invoice_overdue', 'Facturas vencidas', 'Enviar aviso cuando la factura está vencida X días', 7),
('contract_pending', 'Contratos pendientes de firma', 'Recordatorio de contratos sin firmar', 5),
('contract_expiring', 'Contratos por vencer', 'Aviso de renovación de contratos', 30),
('quote_no_response', 'Presupuestos sin respuesta', 'Seguimiento de presupuestos enviados', 7);

-- Update triggers
CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON public.email_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON public.notification_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();