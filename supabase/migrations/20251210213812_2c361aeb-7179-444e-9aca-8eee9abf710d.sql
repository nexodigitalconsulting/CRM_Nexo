-- Update quote template to include company logo
UPDATE public.document_templates 
SET content = '
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
    <div>
      {{company_logo}}
      <h1 style="color: #333; margin-top: 10px;">PRESUPUESTO</h1>
      <p style="color: #666;">Nº {{quote_number}}</p>
    </div>
    <div style="text-align: right;">
      <p><strong>{{company_name}}</strong></p>
      <p>{{company_address}}</p>
      <p>CIF: {{company_cif}}</p>
      <p>{{company_email}}</p>
      <p>{{company_phone}}</p>
    </div>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
    <h3 style="margin: 0 0 10px 0;">PARA:</h3>
    <p><strong>{{client_name}}</strong></p>
    <p>{{client_address}}</p>
    <p>{{client_email}}</p>
    <p>{{client_phone}}</p>
  </div>
  
  <h2 style="margin-bottom: 20px;">{{quote_name}}</h2>
  
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
        <td style="padding: 12px; border-bottom: 1px solid #eee;">{{name}}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{quantity}}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{unit_price}}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{discount_percent}}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{{total}}</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  
  <div style="text-align: right; margin-bottom: 40px;">
    <p><strong>Subtotal:</strong> {{subtotal}}</p>
    <p><strong>IVA:</strong> {{iva_total}}</p>
    <p style="font-size: 1.3em; color: #4f46e5;"><strong>TOTAL:</strong> {{total}}</p>
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
  
  <div style="margin-top: 50px; text-align: center; color: #666; font-size: 10px;">
    <p>Documento generado el {{current_date}}</p>
  </div>
</div>
',
variables = '["quote_number", "company_name", "company_address", "company_cif", "company_email", "company_phone", "company_logo", "client_name", "client_address", "client_email", "client_phone", "quote_name", "services", "subtotal", "iva_total", "total", "valid_until", "notes", "current_date"]'::jsonb,
updated_at = now()
WHERE entity_type = 'quote' AND is_default = true;

-- Update invoice template to include company logo
UPDATE public.document_templates 
SET content = '
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px;">
    <div>
      {{company_logo}}
      <h1 style="margin: 10px 0 0 0; color: #333;">FACTURA</h1>
      <p style="color: #666;">Nº {{invoice_number}}</p>
    </div>
    <div style="text-align: right;">
      <p><strong>{{company_name}}</strong></p>
      <p>{{company_address}}</p>
      <p>CIF: {{company_cif}}</p>
      <p>{{company_email}}</p>
      <p>IBAN: {{company_iban}}</p>
    </div>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
    <h3 style="margin: 0 0 10px 0;">CLIENTE</h3>
    <p><strong>{{client_name}}</strong></p>
    <p>{{client_address}}</p>
    <p>CIF: {{client_cif}}</p>
    <p>{{client_email}}</p>
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
        <td style="padding: 10px; border-bottom: 1px solid #eee;">{{name}}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{quantity}}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{unit_price}}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{total}}</td>
      </tr>
      {{/services}}
    </tbody>
  </table>
  
  <div style="text-align: right;">
    <p><strong>Subtotal:</strong> {{subtotal}}</p>
    <p><strong>IVA:</strong> {{iva_amount}}</p>
    <p style="font-size: 1.2em;"><strong>TOTAL:</strong> {{total}}</p>
  </div>
  
  <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
    <p><strong>Fecha emisión:</strong> {{issue_date}}</p>
    <p><strong>Fecha vencimiento:</strong> {{due_date}}</p>
    <p><strong>Estado:</strong> {{status}}</p>
  </div>
  
  {{#notes}}
  <div style="margin-top: 20px;">
    <h3>Notas:</h3>
    <p>{{notes}}</p>
  </div>
  {{/notes}}
  
  <div style="margin-top: 50px; text-align: center; color: #666; font-size: 10px;">
    <p>Documento generado el {{current_date}}</p>
  </div>
</div>
',
variables = '["invoice_number", "company_name", "company_address", "company_cif", "company_email", "company_iban", "company_logo", "client_name", "client_address", "client_cif", "client_email", "services", "subtotal", "iva_amount", "total", "issue_date", "due_date", "status", "notes", "current_date"]'::jsonb,
updated_at = now()
WHERE entity_type = 'invoice' AND is_default = true;