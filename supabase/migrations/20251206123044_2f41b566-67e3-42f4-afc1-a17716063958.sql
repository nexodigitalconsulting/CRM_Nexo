-- Create document templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contract', 'invoice', 'quote')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view templates"
ON public.document_templates
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage templates"
ON public.document_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Update trigger
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.document_templates (name, entity_type, content, variables, is_default) VALUES
('Contrato Estándar', 'contract', '
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <h1 style="text-align: center; color: #333;">CONTRATO DE SERVICIOS</h1>
  <p style="text-align: center; color: #666;">Nº {{contract_number}}</p>
  
  <h2>PARTES</h2>
  <p><strong>PRESTADOR:</strong> {{company_name}}, con CIF {{company_cif}}</p>
  <p><strong>CLIENTE:</strong> {{client_name}}, con CIF {{client_cif}}</p>
  
  <h2>OBJETO DEL CONTRATO</h2>
  <p>{{contract_name}}</p>
  
  <h2>SERVICIOS INCLUIDOS</h2>
  {{#services}}
  <p>- {{service_name}}: {{service_price}}€</p>
  {{/services}}
  
  <h2>CONDICIONES ECONÓMICAS</h2>
  <p><strong>Subtotal:</strong> {{subtotal}}€</p>
  <p><strong>IVA ({{iva_percent}}%):</strong> {{iva_amount}}€</p>
  <p><strong>TOTAL:</strong> {{total}}€</p>
  <p><strong>Periodicidad:</strong> {{billing_period}}</p>
  
  <h2>DURACIÓN</h2>
  <p>Desde {{start_date}} hasta {{end_date}}</p>
  
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center;">
      <p>_______________________</p>
      <p>El Prestador</p>
    </div>
    <div style="text-align: center;">
      <p>_______________________</p>
      <p>El Cliente</p>
    </div>
  </div>
</div>
', '["contract_number", "company_name", "company_cif", "client_name", "client_cif", "contract_name", "services", "subtotal", "iva_percent", "iva_amount", "total", "billing_period", "start_date", "end_date"]', true),

('Factura Estándar', 'invoice', '
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
    <div>
      <h1 style="margin: 0; color: #333;">FACTURA</h1>
      <p style="color: #666;">Nº {{invoice_number}}</p>
    </div>
    <div style="text-align: right;">
      <p><strong>{{company_name}}</strong></p>
      <p>{{company_address}}</p>
      <p>CIF: {{company_cif}}</p>
    </div>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; margin-bottom: 30px;">
    <h3>CLIENTE</h3>
    <p><strong>{{client_name}}</strong></p>
    <p>{{client_address}}</p>
    <p>CIF: {{client_cif}}</p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <thead>
      <tr style="background: #333; color: white;">
        <th style="padding: 10px; text-align: left;">Concepto</th>
        <th style="padding: 10px; text-align: right;">Cantidad</th>
        <th style="padding: 10px; text-align: right;">Precio</th>
        <th style="padding: 10px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{service_name}}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{quantity}}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{unit_price}}€</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{line_total}}€</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  
  <div style="text-align: right;">
    <p><strong>Subtotal:</strong> {{subtotal}}€</p>
    <p><strong>IVA ({{iva_percent}}%):</strong> {{iva_amount}}€</p>
    <p style="font-size: 1.2em;"><strong>TOTAL:</strong> {{total}}€</p>
  </div>
  
  <div style="margin-top: 40px; padding: 20px; background: #f5f5f5;">
    <p><strong>Fecha emisión:</strong> {{issue_date}}</p>
    <p><strong>Fecha vencimiento:</strong> {{due_date}}</p>
    <p><strong>Forma de pago:</strong> {{payment_method}}</p>
  </div>
</div>
', '["invoice_number", "company_name", "company_address", "company_cif", "client_name", "client_address", "client_cif", "services", "subtotal", "iva_percent", "iva_amount", "total", "issue_date", "due_date", "payment_method"]', true),

('Presupuesto Estándar', 'quote', '
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #333;">PRESUPUESTO</h1>
    <p style="color: #666;">Nº {{quote_number}}</p>
  </div>
  
  <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
    <div>
      <h3>DE:</h3>
      <p><strong>{{company_name}}</strong></p>
      <p>{{company_address}}</p>
      <p>CIF: {{company_cif}}</p>
    </div>
    <div>
      <h3>PARA:</h3>
      <p><strong>{{client_name}}</strong></p>
      <p>{{client_address}}</p>
    </div>
  </div>
  
  <h2>{{quote_name}}</h2>
  
  <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
    <thead>
      <tr style="background: #4f46e5; color: white;">
        <th style="padding: 12px; text-align: left;">Servicio</th>
        <th style="padding: 12px; text-align: right;">Cantidad</th>
        <th style="padding: 12px; text-align: right;">Precio Unit.</th>
        <th style="padding: 12px; text-align: right;">Descuento</th>
        <th style="padding: 12px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">{{service_name}}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{quantity}}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{unit_price}}€</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{discount}}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{line_total}}€</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  
  <div style="text-align: right; margin-bottom: 40px;">
    <p><strong>Subtotal:</strong> {{subtotal}}€</p>
    <p><strong>IVA ({{iva_percent}}%):</strong> {{iva_amount}}€</p>
    <p style="font-size: 1.3em; color: #4f46e5;"><strong>TOTAL:</strong> {{total}}€</p>
  </div>
  
  <div style="background: #fef3c7; padding: 20px; border-radius: 8px;">
    <p><strong>Validez:</strong> Este presupuesto es válido hasta {{valid_until}}</p>
  </div>
  
  {{#notes}}
  <div style="margin-top: 30px;">
    <h3>Notas:</h3>
    <p>{{notes}}</p>
  </div>
  {{/notes}}
</div>
', '["quote_number", "company_name", "company_address", "company_cif", "client_name", "client_address", "quote_name", "services", "subtotal", "iva_percent", "iva_amount", "total", "valid_until", "notes"]', true);