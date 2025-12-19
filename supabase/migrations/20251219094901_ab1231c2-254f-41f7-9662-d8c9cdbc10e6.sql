-- Update Fact2 template with PDF_CONFIG and fix CSS errors
UPDATE document_templates 
SET content = '<!-- PDF_CONFIG: {"primary_color":"#4f46e5","secondary_color":"#6b7280","accent_color":"#4f46e5","show_logo":true,"logo_position":"left","show_iban_footer":true,"show_notes":true,"show_discounts_column":false,"header_style":"classic","font_size_base":10} -->
<div style="font-family: ''Segoe UI'', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>
      {{company_logo}}
      <h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2>
    </div>
    <div style="text-align: right; font-size: 12px; color: #6b7280;">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
      <p style="margin: 4px 0;">{{company_email}}</p>
    </div>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: #4f46e5; font-size: 28px;">FACTURA</h1>
    <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">Nº {{invoice_number}}</p>
  </div>

  <div style="display: flex; gap: 30px; margin: 20px 0;">
    <div>
      <span style="font-size: 12px; color: #6b7280;">Fecha emisión:</span>
      <strong style="margin-left: 8px;">{{issue_date}}</strong>
    </div>
    <div>
      <span style="font-size: 12px; color: #6b7280;">Vencimiento:</span>
      <strong style="margin-left: 8px;">{{due_date}}</strong>
    </div>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Cliente</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background: #4f46e5; color: white;">
        <th style="padding: 12px; text-align: left; font-size: 12px;">Descripción</th>
        <th style="padding: 12px; text-align: center; font-size: 12px; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>{{services_rows}}</tbody>
  </table>

  <div style="margin-left: auto; width: 250px; margin-top: 20px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">IVA ({{iva_percent}}%):</span>
      <span>{{iva_amount}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #4f46e5;">
      <span>TOTAL:</span>
      <span>{{total}}</span>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
    <p>{{company_name}} · {{company_address}}</p>
    <p>IBAN: {{company_iban}}</p>
  </div>
</div>',
updated_at = now()
WHERE id = '95d7953d-1056-42a1-9cbf-a362b299083f';