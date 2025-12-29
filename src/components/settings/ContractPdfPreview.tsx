import { useMemo } from 'react';
import { 
  PdfConfig, 
  PdfSections, 
  getDefaultSections, 
  LegalClause, 
  DEFAULT_LEGAL_CLAUSES,
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
} from '@/lib/pdf/pdfUtils';

interface ContractPdfPreviewProps {
  config?: PdfConfig;
  scale?: number;
}

// Sample data that matches contractPdf.ts structure
const SAMPLE_CONTRACT = {
  contract_number: 15,
  name: 'Servicios de consultoría anual',
  start_date: '01/01/2025',
  end_date: '31/12/2025',
  billing_period: 'Mensual',
  status: 'Activo',
  subtotal: 12000,
  iva_total: 2520,
  total: 14520,
  notes: 'Renovación automática si no se comunica lo contrario con 30 días de antelación.',
};

const SAMPLE_CLIENT = {
  name: 'Cliente Ejemplo S.A.',
  cif: 'A87654321',
  address: 'Av. Comercial 456',
  city: '08001 Barcelona',
  email: 'contacto@cliente.com',
};

const SAMPLE_COMPANY = {
  name: 'Mi Empresa S.L.',
  cif: 'B12345678',
  address: 'Calle Principal 123',
  city: '28001 Madrid',
  phone: '+34 912 345 678',
  email: 'info@miempresa.com',
  iban: 'ES12 3456 7890 1234 5678 9012',
};

const SAMPLE_SERVICES = [
  { name: 'Consultoría mensual', quantity: 1, unit_price: 1000, total: 1000 },
  { name: 'Soporte técnico', quantity: 1, unit_price: 500, total: 500 },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Contract PDF Preview Component
 * 
 * This component renders a preview that exactly matches the layout of contractPdf.ts.
 * It uses the same dimensions, proportions, and rendering order as the pdf-lib generator.
 */
export function ContractPdfPreview({ config, scale = 0.5 }: ContractPdfPreviewProps) {
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
      legal: { ...defaults.legal!, ...config.sections.legal },
      signatures: { ...defaults.signatures!, ...config.sections.signatures },
    };
  }, [config?.sections]);

  const legalClauses: LegalClause[] = config?.legal_clauses || DEFAULT_LEGAL_CLAUSES;
  const visibleClauses = legalClauses.filter(c => c.visible);
  const showSignatures = config?.show_signatures !== false;
  const showLegalClauses = sections.legal?.visible !== false;
  const showNotes = config?.show_notes !== false;
  const showIban = config?.show_iban_footer !== false;
  const showDiscounts = config?.show_discounts_column !== false;

  const primaryColor = config?.primary_color || '#3366cc';
  const secondaryColor = config?.secondary_color || '#666666';
  const fontSize = config?.font_size_base || 10;
  const margin = config?.margins || MARGIN;
  const rowHeight = config?.row_height || sections.table.row_height || 22;

  // Calculate content width
  const contentWidth = A4_WIDTH - margin * 2;

  // Styles that mirror pdf-lib rendering
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

  const renderPage1 = () => (
    <div style={pageStyle}>
      {/* HEADER SECTION - Company */}
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
        <div style={{ fontSize: 18, fontWeight: 'bold', color: primaryColor, marginBottom: 6 }}>
          {SAMPLE_COMPANY.name}
        </div>
        
        {/* Company Details */}
        <div style={{ fontSize: fontSize - 1, color: secondaryColor, lineHeight: 1.5 }}>
          <div>CIF: {SAMPLE_COMPANY.cif}</div>
          <div>{SAMPLE_COMPANY.address}</div>
          <div>{SAMPLE_COMPANY.city}</div>
          <div>Tel: {SAMPLE_COMPANY.phone}</div>
          <div>{SAMPLE_COMPANY.email}</div>
        </div>
      </div>

      {/* DOCUMENT TITLE - Right side */}
      <div style={{
        position: 'absolute',
        top: margin,
        right: margin,
        textAlign: 'right',
      }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: primaryColor }}>
          CONTRATO
        </div>
        <div style={{ fontSize: 20, fontWeight: 'bold', marginTop: 5 }}>
          #{SAMPLE_CONTRACT.contract_number}
        </div>
      </div>

      {/* Separator Line */}
      <div style={{
        borderBottom: '1px solid #ccc',
        marginTop: 10,
        marginBottom: 25,
      }} />

      {/* CONTRACT DETAILS - Right column */}
      <div style={{
        position: 'absolute',
        top: margin + 140,
        right: margin,
        width: 150,
        fontSize: fontSize - 1,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: secondaryColor }}>Fecha inicio:</span>
          <span style={{ fontWeight: 'bold' }}>{SAMPLE_CONTRACT.start_date}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: secondaryColor }}>Fecha fin:</span>
          <span style={{ fontWeight: 'bold' }}>{SAMPLE_CONTRACT.end_date}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: secondaryColor }}>Facturación:</span>
          <span style={{ fontWeight: 'bold' }}>{SAMPLE_CONTRACT.billing_period}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: secondaryColor }}>Estado:</span>
          <span style={{ fontWeight: 'bold' }}>{SAMPLE_CONTRACT.status}</span>
        </div>
      </div>

      {/* CLIENT SECTION */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: fontSize, fontWeight: 'bold', color: secondaryColor, marginBottom: 8 }}>
          CLIENTE
        </div>
        <div style={{ fontSize: fontSize + 1, fontWeight: 'bold', marginBottom: 4 }}>
          {SAMPLE_CLIENT.name}
        </div>
        <div style={{ fontSize: fontSize - 1, color: secondaryColor, lineHeight: 1.4 }}>
          <div>CIF: {SAMPLE_CLIENT.cif}</div>
          <div>{SAMPLE_CLIENT.address}</div>
          <div>{SAMPLE_CLIENT.city}</div>
          <div>{SAMPLE_CLIENT.email}</div>
        </div>
      </div>

      {/* CONTRACT NAME */}
      {SAMPLE_CONTRACT.name && (
        <div style={{ fontSize: fontSize + 1, fontWeight: 'bold', marginBottom: 20 }}>
          {SAMPLE_CONTRACT.name}
        </div>
      )}

      {/* SERVICES TABLE */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: 20,
        fontSize: fontSize - 1,
      }}>
        <thead>
          <tr style={{ backgroundColor: 'rgb(242, 242, 242)' }}>
            <th style={{ padding: '8px 5px', textAlign: 'left', fontWeight: 'bold' }}>Servicio</th>
            <th style={{ padding: '8px 5px', textAlign: 'center', width: 50 }}>Cant.</th>
            <th style={{ padding: '8px 5px', textAlign: 'right', width: 80 }}>Precio</th>
            {showDiscounts && <th style={{ padding: '8px 5px', textAlign: 'right', width: 50 }}>Dto.</th>}
            <th style={{ padding: '8px 5px', textAlign: 'right', width: 80 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_SERVICES.map((svc, idx) => (
            <tr key={idx} style={{
              backgroundColor: idx % 2 === 1 ? 'rgb(250, 250, 250)' : 'transparent',
              height: rowHeight,
            }}>
              <td style={{ padding: '6px 5px' }}>{svc.name}</td>
              <td style={{ padding: '6px 5px', textAlign: 'center' }}>{svc.quantity}</td>
              <td style={{ padding: '6px 5px', textAlign: 'right' }}>{formatCurrency(svc.unit_price)}</td>
              {showDiscounts && <td style={{ padding: '6px 5px', textAlign: 'right' }}>-</td>}
              <td style={{ padding: '6px 5px', textAlign: 'right' }}>{formatCurrency(svc.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Table bottom line */}
      <div style={{ borderBottom: '0.5px solid #ccc', marginBottom: 30 }} />

      {/* TOTALS */}
      <div style={{
        marginLeft: 'auto',
        width: 150,
        fontSize: fontSize,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: secondaryColor }}>Subtotal:</span>
          <span>{formatCurrency(SAMPLE_CONTRACT.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: secondaryColor }}>IVA (21%):</span>
          <span>{formatCurrency(SAMPLE_CONTRACT.iva_total)}</span>
        </div>
        <div style={{ borderTop: '1px solid #ccc', paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize + 2, fontWeight: 'bold' }}>
            <span>TOTAL:</span>
            <span style={{ color: primaryColor, fontSize: fontSize + 4 }}>{formatCurrency(SAMPLE_CONTRACT.total)}</span>
          </div>
        </div>
      </div>

      {/* Billing period note */}
      <div style={{ fontSize: fontSize - 1, color: secondaryColor, marginTop: 15 }}>
        Importe por período de facturación: {SAMPLE_CONTRACT.billing_period}
      </div>

      {/* NOTES */}
      {showNotes && SAMPLE_CONTRACT.notes && (
        <div style={{ marginTop: 25 }}>
          <div style={{ fontSize: fontSize - 1, fontWeight: 'bold', color: secondaryColor, marginBottom: 8 }}>
            Observaciones:
          </div>
          <div style={{ fontSize: fontSize - 2, color: secondaryColor }}>
            {SAMPLE_CONTRACT.notes}
          </div>
        </div>
      )}

      {/* SIGNATURES on Page 1 */}
      {showSignatures && sections.signatures?.visible !== false && (
        <div style={{
          marginTop: 60,
          display: 'flex',
          justifyContent: 'space-around',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: sections.signatures?.line_width || 180,
              borderBottom: '0.5px solid #000',
              height: 40,
            }} />
            <div style={{ fontSize: sections.signatures?.label_size || 9, color: secondaryColor, marginTop: 8 }}>
              {SAMPLE_COMPANY.name}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: sections.signatures?.line_width || 180,
              borderBottom: '0.5px solid #000',
              height: 40,
            }} />
            <div style={{ fontSize: sections.signatures?.label_size || 9, color: secondaryColor, marginTop: 8 }}>
              {SAMPLE_CLIENT.name}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
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
        <span>Página 1 de 2</span>
      </div>
    </div>
  );

  const renderPage2 = () => {
    if (!showLegalClauses || visibleClauses.length === 0) return null;

    return (
      <div style={{ ...pageStyle, marginTop: 20 }}>
        {/* Page 2 header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: fontSize + 2, fontWeight: 'bold', color: primaryColor }}>
            {SAMPLE_COMPANY.name}
          </div>
          <div style={{ fontSize: fontSize, fontWeight: 'bold' }}>
            CONTRATO Nº {SAMPLE_CONTRACT.contract_number} - CONDICIONES GENERALES
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #ccc', marginTop: 15, marginBottom: 25 }} />

        {/* LEGAL CLAUSES */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: primaryColor, marginBottom: 15 }}>
            CLÁUSULAS
          </div>
          
          {visibleClauses.map((clause, idx) => (
            <div key={clause.id} style={{ marginBottom: sections.legal?.clause_spacing || 15 }}>
              <div style={{ 
                fontSize: sections.legal?.title_size || 10, 
                fontWeight: 'bold', 
                marginBottom: 6 
              }}>
                {clause.number} - {clause.title}
              </div>
              <div style={{ 
                fontSize: fontSize - 2, 
                color: secondaryColor, 
                lineHeight: 1.4 
              }}>
                {clause.content
                  .replace(/\{\{company_name\}\}/g, SAMPLE_COMPANY.name)
                  .replace(/\{\{company_cif\}\}/g, SAMPLE_COMPANY.cif)
                  .replace(/\{\{client_name\}\}/g, SAMPLE_CLIENT.name)
                  .replace(/\{\{client_cif\}\}/g, SAMPLE_CLIENT.cif)
                  .replace(/\{\{start_date\}\}/g, SAMPLE_CONTRACT.start_date)
                  .replace(/\{\{end_date\}\}/g, SAMPLE_CONTRACT.end_date)
                  .replace(/\{\{total\}\}/g, formatCurrency(SAMPLE_CONTRACT.total))
                  .replace(/\{\{[^}]+\}\}/g, '')}
              </div>
            </div>
          ))}
        </div>

        {/* FINAL ACCEPTANCE & SIGNATURE */}
        {showSignatures && sections.signatures?.visible !== false && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: fontSize, fontWeight: 'bold', color: primaryColor, marginBottom: 10 }}>
              ACEPTACIÓN DEL CONTRATO
            </div>
            <div style={{ fontSize: fontSize - 2, color: secondaryColor, marginBottom: 20 }}>
              Ambas partes declaran haber leído y aceptado las condiciones del presente contrato.
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: sections.signatures?.line_width || 180,
                  borderBottom: '0.5px solid #000',
                  height: 40,
                }} />
                <div style={{ fontSize: sections.signatures?.label_size || 9, color: secondaryColor, marginTop: 8 }}>
                  El Prestador
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: sections.signatures?.line_width || 180,
                  borderBottom: '0.5px solid #000',
                  height: 40,
                }} />
                <div style={{ fontSize: sections.signatures?.label_size || 9, color: secondaryColor, marginTop: 8 }}>
                  El Cliente
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER Page 2 */}
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
          <span>Página 2 de 2</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page 1 */}
      <div 
        className="bg-white shadow-lg rounded border mx-auto overflow-hidden"
        style={{
          width: A4_WIDTH * scale,
          maxWidth: '100%',
        }}
      >
        <div 
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
          }}
        >
          {renderPage1()}
        </div>
      </div>

      {/* Page 2 - Legal Clauses */}
      {showLegalClauses && visibleClauses.length > 0 && (
        <div 
          className="bg-white shadow-lg rounded border mx-auto overflow-hidden"
          style={{
            width: A4_WIDTH * scale,
            maxWidth: '100%',
          }}
        >
          <div 
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: A4_WIDTH,
              minHeight: A4_HEIGHT,
            }}
          >
            {renderPage2()}
          </div>
        </div>
      )}
    </div>
  );
}
