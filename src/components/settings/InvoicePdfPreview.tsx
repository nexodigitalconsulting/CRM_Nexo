import { useMemo } from 'react';
import { 
  PdfConfig, 
  PdfSections, 
  getDefaultSections, 
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
} from '@/lib/pdf/pdfUtils';

interface InvoicePdfPreviewProps {
  config?: PdfConfig;
  scale?: number;
}

// Sample data matching invoicePdf.ts structure
const SAMPLE_INVOICE = {
  invoice_number: 42,
  issue_date: '18/12/2024',
  due_date: '18/01/2025',
  subtotal: 1250,
  iva_percent: 21,
  iva_amount: 262.5,
  total: 1512.5,
  notes: 'Pago a 30 días. Gracias por confiar en nosotros.',
};

const SAMPLE_CLIENT = {
  name: 'Cliente Ejemplo S.A.',
  cif: 'A87654321',
  address: 'Av. Comercial 456, 08001 Barcelona',
  email: 'contacto@cliente.com',
};

const SAMPLE_COMPANY = {
  name: 'Mi Empresa S.L.',
  cif: 'B12345678',
  address: 'Calle Principal 123, 28001 Madrid',
  phone: '+34 912 345 678',
  email: 'info@miempresa.com',
  iban: 'ES12 3456 7890 1234 5678 9012',
};

const SAMPLE_SERVICES = [
  { name: 'Consultoría estratégica', quantity: 10, unit_price: 75, total: 750 },
  { name: 'Desarrollo web', quantity: 1, unit_price: 500, total: 500 },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatInvoiceNumber = (num: number): string => {
  return `FF-${String(num).padStart(4, '0')}`;
};

/**
 * Invoice PDF Preview Component
 * 
 * This component renders a preview that matches the layout of invoicePdf.ts (pdf-lib).
 * It uses the same dimensions, proportions, and rendering order.
 */
export function InvoicePdfPreview({ config, scale = 0.5 }: InvoicePdfPreviewProps) {
  const sections: PdfSections = useMemo(() => {
    const defaults = getDefaultSections();
    if (!config?.sections) return defaults;
    return {
      ...defaults,
      ...config.sections,
      header: { ...defaults.header, ...config.sections.header },
      title: { ...defaults.title, ...config.sections.title },
      dates: { ...defaults.dates, ...config.sections.dates },
      client: { ...defaults.client, ...config.sections.client },
      table: { ...defaults.table, ...config.sections.table },
      totals: { ...defaults.totals, ...config.sections.totals },
      footer: { ...defaults.footer, ...config.sections.footer },
    };
  }, [config?.sections]);

  const showNotes = config?.show_notes !== false;
  const showIban = config?.show_iban_footer !== false;
  const showDiscounts = config?.show_discounts_column !== false;
  const showTableBorders = config?.show_table_borders !== false;
  const showTotalsLines = config?.show_totals_lines !== false;

  // Colors and sizing from config
  const primaryColor = config?.primary_color || '#3366cc';
  const secondaryColor = config?.secondary_color || '#666666';
  const fontSize = config?.font_size_base || 10;
  const margin = config?.margins || MARGIN;
  const sectionSpacing = config?.section_spacing || 28;
  const lineSpacing = config?.line_spacing || 14;
  const rowHeight = config?.row_height || sections.table.row_height || 22;
  
  // Element colors
  const clientBoxColor = config?.client_box_color || sections.client.background_color || '#f8f9fa';
  const tableHeaderColor = config?.table_header_color || primaryColor;
  const tableBorderColor = config?.table_border_color || sections.table.border_color || '#e5e7eb';

  const contentWidth = A4_WIDTH - margin * 2;

  const pageStyle: React.CSSProperties = {
    width: A4_WIDTH,
    minHeight: A4_HEIGHT,
    padding: margin,
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: fontSize,
    color: '#000',
    lineHeight: 1.4,
    backgroundColor: 'white',
    position: 'relative',
    boxSizing: 'border-box',
  };

  return (
    <div 
      className="bg-white shadow-lg rounded border mx-auto overflow-hidden"
      style={{
        width: A4_WIDTH * scale,
        minHeight: A4_HEIGHT * scale,
        maxWidth: '100%',
      }}
    >
      <div 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div style={pageStyle}>
          {/* HEADER SECTION - Company */}
          {sections.header.visible && (
            <div style={{ marginBottom: 20 }}>
              {/* Company Logo Placeholder */}
              <div style={{
                width: 80,
                height: 40,
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 11,
                marginBottom: 10,
              }}>
                LOGO
              </div>
              
              {/* Company Name */}
              <div style={{ fontSize: 16, fontWeight: 'bold', color: primaryColor, marginBottom: 4 }}>
                {SAMPLE_COMPANY.name}
              </div>
              
              {/* Company Details on Right */}
              <div style={{
                position: 'absolute',
                top: margin,
                right: margin,
                textAlign: 'right',
                fontSize: fontSize - 1,
                color: secondaryColor,
                lineHeight: 1.5,
              }}>
                <div>{SAMPLE_COMPANY.address}</div>
                <div>CIF: {SAMPLE_COMPANY.cif}</div>
                <div>{SAMPLE_COMPANY.email}</div>
              </div>
            </div>
          )}

          {/* TITLE SECTION */}
          {sections.title.visible && (
            <div style={{ textAlign: 'center', marginTop: 10, marginBottom: sectionSpacing }}>
              <div style={{ 
                fontSize: sections.title.size || 28, 
                fontWeight: 'bold', 
                color: primaryColor 
              }}>
                {config?.title_text || 'FACTURA'}
              </div>
              <div style={{ fontSize: 16, color: secondaryColor, marginTop: 8 }}>
                Nº {formatInvoiceNumber(SAMPLE_INVOICE.invoice_number)}
              </div>
            </div>
          )}

          {/* DATES SECTION */}
          {sections.dates.visible && (
            <div style={{ 
              display: 'flex', 
              gap: 60, 
              marginBottom: sectionSpacing,
              fontSize: fontSize - 1,
            }}>
              <div>
                <span style={{ color: secondaryColor }}>Fecha emisión: </span>
                <span style={{ fontWeight: 'bold' }}>{SAMPLE_INVOICE.issue_date}</span>
              </div>
              <div>
                <span style={{ color: secondaryColor }}>Vencimiento: </span>
                <span style={{ fontWeight: 'bold' }}>{SAMPLE_INVOICE.due_date}</span>
              </div>
            </div>
          )}

          {/* CLIENT SECTION */}
          {sections.client.visible && (
            <div style={{ 
              background: clientBoxColor, 
              padding: sections.client.padding || 14,
              borderRadius: 4,
              marginBottom: sectionSpacing,
            }}>
              <div style={{ 
                fontSize: fontSize - 2, 
                fontWeight: 'bold', 
                color: secondaryColor, 
                marginBottom: 8,
                textTransform: 'uppercase',
              }}>
                CLIENTE
              </div>
              <div style={{ fontSize: fontSize + 1, fontWeight: 'bold', marginBottom: 4 }}>
                {SAMPLE_CLIENT.name}
              </div>
              <div style={{ fontSize: fontSize - 1, color: secondaryColor, lineHeight: 1.4 }}>
                <div>{SAMPLE_CLIENT.address}</div>
                <div>CIF: {SAMPLE_CLIENT.cif}</div>
              </div>
            </div>
          )}

          {/* TABLE SECTION */}
          {sections.table.visible && (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: sectionSpacing,
              fontSize: fontSize - 1,
            }}>
              <thead>
                <tr style={{ backgroundColor: tableHeaderColor, color: 'white' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Descripción</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: 50 }}>Cant.</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', width: 80 }}>Precio</th>
                  {showDiscounts && <th style={{ padding: '10px 8px', textAlign: 'right', width: 50 }}>Dto.</th>}
                  <th style={{ padding: '10px 8px', textAlign: 'right', width: 80 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_SERVICES.map((svc, idx) => (
                  <tr key={idx} style={{
                    backgroundColor: idx % 2 === 1 ? 'rgb(250, 250, 250)' : 'transparent',
                    height: rowHeight,
                    borderBottom: showTableBorders ? `1px solid ${tableBorderColor}` : 'none',
                  }}>
                    <td style={{ padding: '6px 8px' }}>{svc.name}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{svc.quantity}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(svc.unit_price)}</td>
                    {showDiscounts && <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(svc.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TOTALS SECTION */}
          {sections.totals.visible && (
            <div style={{
              marginLeft: 'auto',
              width: 200,
              fontSize: fontSize,
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '6px 0',
                borderBottom: showTotalsLines ? `1px solid ${tableBorderColor}` : 'none',
              }}>
                <span style={{ color: secondaryColor }}>Subtotal:</span>
                <span>{formatCurrency(SAMPLE_INVOICE.subtotal)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '6px 0',
                borderBottom: showTotalsLines ? `1px solid ${tableBorderColor}` : 'none',
              }}>
                <span style={{ color: secondaryColor }}>IVA ({SAMPLE_INVOICE.iva_percent}%):</span>
                <span>{formatCurrency(SAMPLE_INVOICE.iva_amount)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '10px 0',
                fontSize: fontSize + 4,
                fontWeight: 'bold',
              }}>
                <span>TOTAL:</span>
                <span style={{ color: primaryColor }}>{formatCurrency(SAMPLE_INVOICE.total)}</span>
              </div>
            </div>
          )}

          {/* NOTES */}
          {showNotes && SAMPLE_INVOICE.notes && (
            <div style={{ marginTop: sectionSpacing }}>
              <div style={{ 
                fontSize: fontSize - 1, 
                fontWeight: 'bold', 
                color: secondaryColor, 
                marginBottom: 6 
              }}>
                Observaciones:
              </div>
              <div style={{ fontSize: fontSize - 2, color: secondaryColor }}>
                {SAMPLE_INVOICE.notes}
              </div>
            </div>
          )}

          {/* FOOTER */}
          {sections.footer.visible && (
            <div style={{
              position: 'absolute',
              bottom: 30,
              left: margin,
              right: margin,
              borderTop: '0.5px solid #ccc',
              paddingTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 8,
              color: secondaryColor,
            }}>
              <span>{showIban ? `IBAN: ${SAMPLE_COMPANY.iban}` : SAMPLE_COMPANY.name}</span>
              <span>Página 1 de 1</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
