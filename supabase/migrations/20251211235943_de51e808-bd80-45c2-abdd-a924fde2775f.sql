-- Insertar plantillas de email si no existen
INSERT INTO public.email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Envío de Factura', 'invoice_send', 'Factura {{invoice_number}} - {{company_name}}', 
'<h2>Estimado/a {{client_name}},</h2>
<p>Adjunto encontrará la factura <strong>{{invoice_number}}</strong> correspondiente a nuestros servicios.</p>
<p><strong>Importe total:</strong> {{total}} €</p>
<p><strong>Fecha de vencimiento:</strong> {{due_date}}</p>
<p>Si tiene alguna pregunta, no dude en contactarnos.</p>
<p>Saludos cordiales,<br>{{company_name}}</p>', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_type = 'invoice_send');

INSERT INTO public.email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Envío de Contrato', 'contract_send', 'Contrato {{contract_number}} - {{company_name}}', 
'<h2>Estimado/a {{client_name}},</h2>
<p>Adjunto encontrará el contrato <strong>{{contract_number}}</strong> para su revisión y firma.</p>
<p><strong>Fecha de inicio:</strong> {{start_date}}</p>
<p><strong>Importe:</strong> {{total}} €</p>
<p>Por favor, revise el documento y proceda a firmarlo a la mayor brevedad.</p>
<p>Saludos cordiales,<br>{{company_name}}</p>', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_type = 'contract_send');

INSERT INTO public.email_templates (name, template_type, subject, body_html, is_active)
SELECT 'Envío de Presupuesto', 'quote_send', 'Presupuesto {{quote_number}} - {{company_name}}', 
'<h2>Estimado/a {{client_name}},</h2>
<p>Adjunto encontrará el presupuesto <strong>{{quote_number}}</strong> que ha solicitado.</p>
<p><strong>Importe total:</strong> {{total}} €</p>
<p><strong>Válido hasta:</strong> {{valid_until}}</p>
<p>Quedamos a su disposición para cualquier consulta.</p>
<p>Saludos cordiales,<br>{{company_name}}</p>', true
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_type = 'quote_send');