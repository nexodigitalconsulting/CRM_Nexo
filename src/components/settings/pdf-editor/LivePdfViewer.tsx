import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { BlockType } from './types';
import { PdfConfig, getDefaultSections, hexToRgb } from '@/lib/pdf/pdfUtils';
import { cn } from '@/lib/utils';

interface LivePdfViewerProps {
  documentType: 'invoice' | 'quote' | 'contract';
  config: PdfConfig;
  selectedSection: BlockType | null;
  onSectionClick: (sectionId: BlockType) => void;
  scale?: number;
}

const documentLabels = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

// Sample data for preview
const SAMPLE_COMPANY = {
  name: 'Mi Empresa S.L.',
  cif: 'B12345678',
  address: 'Calle Principal, 123',
  city: 'Madrid',
  postal_code: '28001',
  phone: '+34 912 345 678',
  email: 'info@miempresa.com',
  iban: 'ES12 3456 7890 1234 5678 9012',
};

const SAMPLE_CLIENT = {
  name: 'Cliente Ejemplo S.A.',
  cif: 'A87654321',
  address: 'Avenida Secundaria, 456',
  city: 'Barcelona',
  postal_code: '08001',
};

const SAMPLE_SERVICES = [
  { name: 'Desarrollo Web', quantity: 1, price: 1500, subtotal: 1500 },
  { name: 'Mantenimiento', quantity: 2, price: 200, subtotal: 400 },
];

export function LivePdfViewer({
  documentType,
  config,
  selectedSection,
  onSectionClick,
  scale = 0.5,
}: LivePdfViewerProps) {
  const sections = config.sections || getDefaultSections();
  const primaryColor = config.primary_color || '#3366cc';
  const secondaryColor = config.secondary_color || '#666666';

  // Calculate totals
  const subtotal = SAMPLE_SERVICES.reduce((sum, s) => sum + s.subtotal, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const renderClickableSection = (
    sectionId: BlockType, 
    visible: boolean, 
    children: React.ReactNode,
    className?: string
  ) => {
    if (!visible) return null;
    
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSectionClick(sectionId);
        }}
        className={cn(
          'cursor-pointer transition-all relative group',
          selectedSection === sectionId && 'ring-2 ring-primary ring-offset-1 rounded',
          className
        )}
      >
        {children}
        {/* Hover indicator */}
        <div className={cn(
          'absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none',
          selectedSection === sectionId && 'bg-primary/10 opacity-100'
        )} />
        {/* Section label on hover */}
        <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Badge variant="secondary" className="text-[8px] px-1 py-0">
            {sectionId}
          </Badge>
        </div>
      </div>
    );
  };

  // A4 dimensions scaled
  const pageStyle = useMemo(() => ({
    width: 595 * scale,
    minHeight: 842 * scale,
    padding: 50 * scale,
    fontSize: 10 * scale,
  }), [scale]);

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista previa interactiva
          </span>
          <Badge variant="secondary">{documentLabels[documentType]}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Click en una sección para editarla
        </p>
      </CardHeader>
      <CardContent>
        <div 
          className="bg-white shadow-lg border mx-auto overflow-hidden"
          style={pageStyle}
        >
          {/* Header Section */}
          {renderClickableSection('header', sections.header.visible, (
            <div className="flex justify-between items-start" style={{ marginBottom: sections.header.spacing * scale }}>
              <div>
                <div 
                  className="font-bold" 
                  style={{ fontSize: 14 * scale, color: primaryColor }}
                >
                  {SAMPLE_COMPANY.name}
                </div>
                <div style={{ fontSize: 9 * scale, color: secondaryColor }}>
                  {SAMPLE_COMPANY.cif}
                </div>
                <div style={{ fontSize: 8 * scale, color: '#666', marginTop: 4 * scale }}>
                  {SAMPLE_COMPANY.address}<br />
                  {SAMPLE_COMPANY.postal_code} {SAMPLE_COMPANY.city}
                </div>
              </div>
              <div 
                className="bg-gray-200 flex items-center justify-center rounded"
                style={{ width: 60 * scale, height: 40 * scale, fontSize: 8 * scale }}
              >
                LOGO
              </div>
            </div>
          ))}

          {/* Title Section */}
          {renderClickableSection('title', sections.title.visible, (
            <div 
              className="text-center font-bold"
              style={{ 
                fontSize: (sections.title.size || 28) * scale, 
                color: primaryColor,
                marginTop: sections.title.margin_top * scale,
                marginBottom: sections.title.spacing * scale,
              }}
            >
              {config.title_text || documentLabels[documentType].toUpperCase()}
            </div>
          ))}

          {/* Dates Section */}
          {renderClickableSection('dates', sections.dates.visible, (
            <div 
              className="flex justify-between"
              style={{ 
                marginTop: sections.dates.margin_top * scale,
                fontSize: 9 * scale,
              }}
            >
              <span><strong>Nº:</strong> {documentType === 'invoice' ? 'FF-0042' : documentType === 'quote' ? 'PP-0015' : 'CT-0008'}</span>
              <span><strong>Fecha:</strong> 11/01/2026</span>
              <span><strong>Vencimiento:</strong> 11/02/2026</span>
            </div>
          ))}

          {/* Client Section */}
          {renderClickableSection('client', sections.client.visible, (
            <div 
              className="rounded"
              style={{ 
                marginTop: sections.client.margin_top * scale,
                padding: sections.client.padding * scale,
                backgroundColor: sections.client.background_color || '#f8f9fa',
              }}
            >
              <div style={{ fontSize: 8 * scale, color: secondaryColor, marginBottom: 4 * scale }}>
                FACTURAR A:
              </div>
              <div style={{ fontSize: 10 * scale, fontWeight: 600 }}>
                {SAMPLE_CLIENT.name}
              </div>
              <div style={{ fontSize: 9 * scale, color: '#666' }}>
                CIF: {SAMPLE_CLIENT.cif}
              </div>
              <div style={{ fontSize: 8 * scale, color: '#666' }}>
                {SAMPLE_CLIENT.address}<br />
                {SAMPLE_CLIENT.postal_code} {SAMPLE_CLIENT.city}
              </div>
            </div>
          ))}

          {/* Table Section */}
          {renderClickableSection('table', sections.table.visible, (
            <div style={{ marginTop: sections.table.margin_top * scale }}>
              {/* Table Header */}
              <div 
                className="flex text-white font-medium"
                style={{ 
                  backgroundColor: config.table_header_color || primaryColor,
                  height: sections.table.header_height * scale,
                  fontSize: 8 * scale,
                  padding: `0 ${8 * scale}px`,
                  alignItems: 'center',
                }}
              >
                <span style={{ flex: 3 }}>Descripción</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Cant.</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Precio</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
              </div>
              {/* Table Rows */}
              {SAMPLE_SERVICES.map((service, idx) => (
                <div 
                  key={idx}
                  className="flex"
                  style={{ 
                    height: sections.table.row_height * scale,
                    fontSize: 8 * scale,
                    padding: `0 ${8 * scale}px`,
                    alignItems: 'center',
                    borderBottom: sections.table.show_borders 
                      ? `1px solid ${sections.table.border_color || '#e5e7eb'}` 
                      : 'none',
                  }}
                >
                  <span style={{ flex: 3 }}>{service.name}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{service.quantity}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{formatCurrency(service.price)}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{formatCurrency(service.subtotal)}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Totals Section */}
          {renderClickableSection('totals', sections.totals.visible, (
            <div 
              className="flex flex-col items-end"
              style={{ 
                marginTop: sections.totals.margin_top * scale,
                fontSize: 9 * scale,
              }}
            >
              <div className="flex justify-between" style={{ width: 120 * scale, marginBottom: 4 * scale }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {sections.totals.show_lines && (
                <div 
                  style={{ 
                    width: 120 * scale, 
                    height: 1, 
                    backgroundColor: sections.totals.line_color || '#e5e7eb',
                    marginBottom: 4 * scale,
                  }} 
                />
              )}
              <div className="flex justify-between" style={{ width: 120 * scale, marginBottom: 4 * scale }}>
                <span>IVA (21%):</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              {sections.totals.show_lines && (
                <div 
                  style={{ 
                    width: 120 * scale, 
                    height: 1, 
                    backgroundColor: sections.totals.line_color || '#e5e7eb',
                    marginBottom: 4 * scale,
                  }} 
                />
              )}
              <div 
                className="flex justify-between font-bold"
                style={{ width: 120 * scale, color: primaryColor }}
              >
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          ))}

          {/* Footer Section */}
          {renderClickableSection('footer', sections.footer.visible, (
            <div 
              className="text-center border-t pt-2"
              style={{ 
                marginTop: sections.footer.margin_top * scale,
                fontSize: 7 * scale,
                color: '#888',
              }}
            >
              {sections.footer.show_iban && (
                <div>IBAN: {SAMPLE_COMPANY.iban}</div>
              )}
              <div style={{ marginTop: 4 * scale }}>Página 1 de 1</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Vista previa con datos de ejemplo
        </p>
      </CardContent>
    </Card>
  );
}
