-- ============================================
-- 04. Datos iniciales del CRM
-- ============================================
-- Datos por defecto para nuevas instalaciones

-- ============================================
-- Configuración de empresa por defecto
-- ============================================
INSERT INTO public.company_settings (
  name, 
  currency, 
  language, 
  timezone, 
  date_format,
  country
) VALUES (
  'Mi Empresa CRM',
  'EUR',
  'es',
  'Europe/Madrid',
  'DD/MM/YYYY',
  'España'
) ON CONFLICT DO NOTHING;

-- ============================================
-- Servicios de ejemplo
-- ============================================
INSERT INTO public.services (name, description, category, price, iva_percent, status) VALUES
  ('Consultoría Estratégica', 'Sesión de consultoría estratégica empresarial', 'Consultoría', 150.00, 21.00, 'active'),
  ('Desarrollo Web', 'Desarrollo de página web corporativa', 'Desarrollo', 2500.00, 21.00, 'active'),
  ('Mantenimiento Web', 'Mantenimiento mensual de sitio web', 'Mantenimiento', 150.00, 21.00, 'active'),
  ('SEO Mensual', 'Optimización SEO mensual', 'Marketing', 300.00, 21.00, 'active'),
  ('Gestión Redes Sociales', 'Community management mensual', 'Marketing', 400.00, 21.00, 'active'),
  ('Diseño Gráfico', 'Diseño de identidad corporativa', 'Diseño', 800.00, 21.00, 'active'),
  ('Formación', 'Sesión de formación personalizada (hora)', 'Formación', 80.00, 21.00, 'active'),
  ('Soporte Técnico', 'Hora de soporte técnico', 'Soporte', 60.00, 21.00, 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- Plantillas de email por defecto
-- ============================================
INSERT INTO public.email_templates (name, template_type, subject, body_html, is_active) VALUES
(
  'Factura Emitida',
  'invoice_issued',
  'Factura {{invoice_number}} - {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1e40af;">Factura {{invoice_number}}</h2>
    <p>Estimado/a {{client_name}},</p>
    <p>Adjunto encontrará la factura <strong>{{invoice_number}}</strong> por un importe de <strong>{{total}}€</strong>.</p>
    <p>Fecha de emisión: {{issue_date}}</p>
    <p>Fecha de vencimiento: {{due_date}}</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
    <p>Saludos cordiales,<br><strong>{{company_name}}</strong></p>
  </div>',
  true
),
(
  'Recordatorio de Pago',
  'payment_reminder',
  'Recordatorio: Factura {{invoice_number}} pendiente - {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #dc2626;">Recordatorio de Pago</h2>
    <p>Estimado/a {{client_name}},</p>
    <p>Le recordamos que la factura <strong>{{invoice_number}}</strong> por importe de <strong>{{total}}€</strong> se encuentra pendiente de pago.</p>
    <p>Fecha de vencimiento: {{due_date}}</p>
    <p>Por favor, proceda al pago a la mayor brevedad posible.</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p>Si ya ha realizado el pago, por favor ignore este mensaje.</p>
    <p>Saludos cordiales,<br><strong>{{company_name}}</strong></p>
  </div>',
  true
),
(
  'Presupuesto Enviado',
  'quote_sent',
  'Presupuesto {{quote_number}} - {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #059669;">Presupuesto {{quote_number}}</h2>
    <p>Estimado/a {{client_name}},</p>
    <p>Adjunto encontrará el presupuesto <strong>{{quote_number}}</strong> que hemos preparado para usted.</p>
    <p>Importe total: <strong>{{total}}€</strong></p>
    <p>Válido hasta: {{valid_until}}</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p>Quedamos a su disposición para cualquier aclaración.</p>
    <p>Saludos cordiales,<br><strong>{{company_name}}</strong></p>
  </div>',
  true
),
(
  'Contrato Activado',
  'contract_activated',
  'Contrato {{contract_number}} activado - {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #7c3aed;">Contrato Activado</h2>
    <p>Estimado/a {{client_name}},</p>
    <p>Le confirmamos que su contrato <strong>{{contract_number}}</strong> ha sido activado correctamente.</p>
    <p>Fecha de inicio: {{start_date}}</p>
    <p>Período de facturación: {{billing_period}}</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p>Gracias por confiar en nosotros.</p>
    <p>Saludos cordiales,<br><strong>{{company_name}}</strong></p>
  </div>',
  true
),
(
  'Bienvenida Cliente',
  'welcome_client',
  '¡Bienvenido/a a {{company_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #0891b2;">¡Bienvenido/a!</h2>
    <p>Estimado/a {{client_name}},</p>
    <p>Es un placer darle la bienvenida como cliente de <strong>{{company_name}}</strong>.</p>
    <p>A partir de ahora, podrá contar con nuestro equipo para cualquier necesidad.</p>
    <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
    <p>No dude en contactarnos si tiene alguna pregunta.</p>
    <p>Saludos cordiales,<br><strong>{{company_name}}</strong></p>
  </div>',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Reglas de notificación por defecto
-- ============================================
INSERT INTO public.notification_rules (name, rule_type, description, days_threshold, is_active) VALUES
  ('Recordatorio pre-vencimiento', 'invoice_due_soon', 'Enviar recordatorio antes del vencimiento', 3, true),
  ('Factura vencida', 'invoice_overdue', 'Notificar facturas vencidas', 1, true),
  ('Próxima facturación', 'contract_billing_soon', 'Avisar de próxima facturación de contrato', 7, true),
  ('Contrato por expirar', 'contract_expiring', 'Avisar de contratos próximos a expirar', 30, true),
  ('Presupuesto por expirar', 'quote_expiring', 'Avisar de presupuestos próximos a expirar', 5, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Plantillas de documentos por defecto
-- ============================================
INSERT INTO public.document_templates (name, entity_type, content, is_default, is_active) VALUES
(
  'Factura Estándar',
  'invoice',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .invoice-title { font-size: 32px; color: #1e40af; font-weight: bold; }
    .company-info { text-align: right; }
    .client-section { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f3f4f6; font-weight: bold; }
    .totals { text-align: right; margin-top: 20px; }
    .total-row { font-size: 18px; font-weight: bold; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-title">FACTURA {{invoice_number}}</div>
    <div class="company-info">
      <strong>{{company_name}}</strong><br>
      {{company_address}}<br>
      CIF: {{company_cif}}<br>
      {{company_email}}
    </div>
  </div>
  <div class="client-section">
    <strong>Cliente:</strong><br>
    {{client_name}}<br>
    {{client_address}}<br>
    CIF: {{client_cif}}
  </div>
  <p><strong>Fecha:</strong> {{issue_date}} | <strong>Vencimiento:</strong> {{due_date}}</p>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}€</td>
        <td>{{total}}€</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  <div class="totals">
    <p>Subtotal: {{subtotal}}€</p>
    <p>IVA ({{iva_percent}}%): {{iva_amount}}€</p>
    <p class="total-row">TOTAL: {{total}}€</p>
  </div>
</body>
</html>',
  true,
  true
),
(
  'Presupuesto Estándar',
  'quote',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .quote-title { font-size: 32px; color: #059669; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #ecfdf5; font-weight: bold; }
    .validity { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .total-row { font-size: 20px; font-weight: bold; color: #059669; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div class="quote-title">PRESUPUESTO {{quote_number}}</div>
    <div>{{company_name}}</div>
  </div>
  <p><strong>Para:</strong> {{client_name}}</p>
  <p><strong>Fecha:</strong> {{created_at}}</p>
  <div class="validity">
    <strong>⏰ Válido hasta:</strong> {{valid_until}}
  </div>
  <table>
    <thead>
      <tr>
        <th>Servicio</th>
        <th>Cantidad</th>
        <th>Precio</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unit_price}}€</td>
        <td>{{total}}€</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  <p class="total-row">TOTAL: {{total}}€ (IVA incluido)</p>
</body>
</html>',
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Configuraciones de entidades
-- ============================================
INSERT INTO public.entity_configurations (entity_name, display_name, icon, is_system, is_active) VALUES
  ('clients', 'Clientes', 'Users', true, true),
  ('contacts', 'Contactos', 'UserPlus', true, true),
  ('quotes', 'Presupuestos', 'FileText', true, true),
  ('contracts', 'Contratos', 'FileCheck', true, true),
  ('invoices', 'Facturas', 'Receipt', true, true),
  ('services', 'Servicios', 'Briefcase', true, true),
  ('expenses', 'Gastos', 'CreditCard', true, true),
  ('campaigns', 'Campañas', 'Target', true, true),
  ('remittances', 'Remesas', 'Banknote', true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DE DATOS INICIALES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Datos iniciales insertados correctamente';
END $$;
