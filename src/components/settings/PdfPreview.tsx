import { useMemo } from 'react';
import { PdfConfig } from '@/lib/pdf/pdfUtils';

interface PdfPreviewProps {
  content: string;
  documentType: 'invoice' | 'contract' | 'quote';
  scale?: number;
  config?: PdfConfig;
}

// Datos de ejemplo para la previsualización
const SAMPLE_DATA = {
  invoice: {
    company_name: 'Mi Empresa S.L.',
    company_cif: 'B12345678',
    company_address: 'Calle Principal 123, 28001 Madrid',
    company_email: 'info@miempresa.com',
    company_phone: '+34 912 345 678',
    company_iban: 'ES12 3456 7890 1234 5678 9012',
    company_logo: '<div style="width:80px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">LOGO</div>',
    client_name: 'Cliente Ejemplo S.A.',
    client_cif: 'A87654321',
    client_address: 'Av. Comercial 456, 08001 Barcelona',
    client_email: 'contacto@cliente.com',
    client_phone: '+34 934 567 890',
    invoice_number: 'F-2024-0042',
    issue_date: '18/12/2024',
    due_date: '18/01/2025',
    subtotal: '1.250,00 €',
    iva_percent: '21',
    iva_amount: '262,50 €',
    total: '1.512,50 €',
    notes: 'Pago a 30 días. Gracias por confiar en nosotros.',
    current_date: '18/12/2024',
    services: [
      { name: 'Consultoría estratégica', quantity: 10, unit_price: '75,00 €', discount_percent: 0, total: '750,00 €' },
      { name: 'Desarrollo web', quantity: 1, unit_price: '500,00 €', discount_percent: 0, total: '500,00 €' },
    ],
  },
  contract: {
    company_name: 'Mi Empresa S.L.',
    company_cif: 'B12345678',
    company_address: 'Calle Principal 123, 28001 Madrid',
    company_iban: 'ES12 3456 7890 1234 5678 9012',
    client_name: 'Cliente Ejemplo S.A.',
    client_cif: 'A87654321',
    client_address: 'Av. Comercial 456, 08001 Barcelona',
    contract_number: 'C-2024-0015',
    contract_name: 'Servicios de consultoría anual',
    start_date: '01/01/2025',
    end_date: '31/12/2025',
    subtotal: '12.000,00 €',
    iva_percent: '21',
    iva_amount: '2.520,00 €',
    total: '14.520,00 €',
    billing_period: 'Mensual',
    current_date: '18/12/2024',
    company_logo: '<div style="width:80px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">LOGO</div>',
    services: [
      { name: 'Consultoría mensual', quantity: 1, unit_price: '1.000,00 €', total: '1.000,00 €' },
      { name: 'Soporte técnico', quantity: 1, unit_price: '500,00 €', total: '500,00 €' },
    ],
    services_rows: `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 12px;">Consultoría mensual</td><td style="padding: 12px; text-align: center;">1</td><td style="padding: 12px; text-align: right;">1.000,00 €</td><td style="padding: 12px; text-align: right;">1.000,00 €</td></tr>`,
    legal_clauses: `<div style="margin: 20px 0;"><p><strong>PRIMERA - OBJETO:</strong> El prestador se compromete a proporcionar los servicios descritos.</p><p><strong>SEGUNDA - DURACIÓN:</strong> El contrato tendrá vigencia desde la fecha de inicio hasta la fecha de fin.</p></div>`,
  },
  quote: {
    company_name: 'Mi Empresa S.L.',
    company_cif: 'B12345678',
    company_address: 'Calle Principal 123, 28001 Madrid',
    company_email: 'info@miempresa.com',
    company_phone: '+34 912 345 678',
    company_logo: '<div style="width:80px;height:40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">LOGO</div>',
    client_name: 'Prospecto Interesado S.L.',
    client_address: 'Plaza Nueva 789, 46001 Valencia',
    client_email: 'info@prospecto.com',
    client_phone: '+34 963 456 789',
    quote_number: 'P-2024-0089',
    quote_name: 'Propuesta de servicios digitales',
    quote_date: '18/12/2024',
    valid_until: '18/01/2025',
    subtotal: '3.500,00 €',
    iva_percent: '21',
    iva_total: '735,00 €',
    total: '4.235,00 €',
    notes: 'Presupuesto válido por 30 días.',
    current_date: '18/12/2024',
    services: [
      { name: 'Diseño web', quantity: 1, unit_price: '2.000,00 €', discount_percent: 0, total: '2.000,00 €' },
      { name: 'SEO inicial', quantity: 1, unit_price: '1.500,00 €', discount_percent: 0, total: '1.500,00 €' },
    ],
  },
};

function replaceVariables(content: string, data: Record<string, unknown>): string {
  let result = content;

  // Generate services_rows from services array
  const services = data.services as Array<Record<string, unknown>>;
  if (services && Array.isArray(services)) {
    const servicesRows = services.map((service, index) => 
      `<tr style="border-bottom: 1px solid #e5e7eb;${index % 2 === 1 ? 'background:#f9fafb;' : ''}">
        <td style="padding: 12px; font-size: 13px;">${service.name || service.service_name || ''}</td>
        <td style="padding: 12px; text-align: center; font-size: 13px;">${service.quantity || 1}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">${service.unit_price || service.service_price || ''}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">${service.total || ''}</td>
      </tr>`
    ).join('');
    result = result.replace(/\{\{services_rows\}\}/g, servicesRows);
  }

  // Replace simple variables {{variable}}
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });

  // Handle arrays with mustache-like syntax {{#array}}...{{/array}}
  const arrayPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  let match;
  
  while ((match = arrayPattern.exec(content)) !== null) {
    const [fullMatch, arrayName, template] = match;
    const arrayData = data[arrayName];
    
    if (Array.isArray(arrayData)) {
      const rendered = arrayData.map((item) => {
        let itemHtml = template;
        Object.entries(item).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          itemHtml = itemHtml.replace(regex, String(value));
        });
        return itemHtml;
      }).join('');
      result = result.replace(fullMatch, rendered);
    }
  }

  // Clean up any remaining unmatched variables
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

export function PdfPreview({ content, documentType, scale = 0.5, config }: PdfPreviewProps) {
  const renderedContent = useMemo(() => {
    const data = SAMPLE_DATA[documentType];
    let result = replaceVariables(content, data);
    
    // Apply config overrides for visual preview consistency
    if (config?.title_text) {
      // Replace title text in preview
      result = result.replace(/>FACTURA</g, `>${config.title_text}<`);
      result = result.replace(/>PRESUPUESTO</g, `>${config.title_text}<`);
      result = result.replace(/>CONTRATO</g, `>${config.title_text}<`);
    }
    
    return result;
  }, [content, documentType, config]);

  // A4 dimensions in pixels at 72 DPI: 595 x 842
  const pageWidth = 595;
  const pageHeight = 842;

  return (
    <div 
      className="bg-white shadow-lg rounded border mx-auto"
      style={{
        width: pageWidth * scale,
        minHeight: pageHeight * scale,
        maxWidth: '100%',
      }}
    >
      <div 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: pageWidth,
          minHeight: pageHeight,
          padding: 40,
          fontSize: 14,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: '#1f2937',
          lineHeight: 1.5,
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
      </div>
    </div>
  );
}
