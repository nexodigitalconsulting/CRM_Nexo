import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { BlockType, getOrderFromBlocks, getDefaultBlocks, PdfBlock } from './types';
import { PdfConfig, getDefaultSections, DEFAULT_SECTION_ORDER, DEFAULT_CONTRACT_SECTION_ORDER } from '@/lib/pdf/pdfUtils';
import { cn } from '@/lib/utils';

interface LivePdfViewerProps {
  documentType: 'invoice' | 'quote' | 'contract';
  config: PdfConfig;
  selectedSection: BlockType | null;
  onSectionClick: (sectionId: BlockType) => void;
  scale?: number;
  blocks?: PdfBlock[];
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
  blocks,
}: LivePdfViewerProps) {
  const sections = config.sections || getDefaultSections();
  const primaryColor = config.primary_color || '#3366cc';
  const secondaryColor = config.secondary_color || '#666666';

  // Determine section order from blocks or config
  const sectionOrder = useMemo(() => {
    if (blocks && blocks.length > 0) {
      return getOrderFromBlocks(blocks);
    }
    if (config.section_order) {
      return config.section_order;
    }
    return documentType === 'contract' ? DEFAULT_CONTRACT_SECTION_ORDER : DEFAULT_SECTION_ORDER;
  }, [blocks, config.section_order, documentType]);

  // Calculate totals
  const subtotal = SAMPLE_SERVICES.reduce((sum, s) => sum + s.subtotal, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const renderClickableSection = useCallback((
    sectionId: BlockType, 
    visible: boolean, 
    children: React.ReactNode,
    className?: string
  ) => {
    if (!visible) return null;
    
    return (
      <div
        key={sectionId}
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
  }, [selectedSection, onSectionClick]);

  // A4 dimensions scaled
  const pageStyle = useMemo(() => ({
    width: 595 * scale,
    minHeight: 842 * scale,
    padding: 50 * scale,
    fontSize: 10 * scale,
  }), [scale]);

  // Section render functions that match the real PDF layout
  const renderHeader = useCallback(() => {
    return renderClickableSection('header', sections.header.visible, (
      <div className="flex justify-between items-start" style={{ marginBottom: sections.header.spacing * scale }}>
        {/* Logo on LEFT (matches invoicePdf.ts) */}
        <div className="flex items-center gap-3">
          <div 
            className="bg-gray-200 flex items-center justify-center rounded"
            style={{ width: 50 * scale, height: 35 * scale, fontSize: 7 * scale }}
          >
            LOGO
          </div>
          <div 
            className="font-bold" 
            style={{ fontSize: 14 * scale, color: primaryColor }}
          >
            {SAMPLE_COMPANY.name}
          </div>
        </div>
        {/* Company details on RIGHT (matches invoicePdf.ts lines 153-169) */}
        <div className="text-right" style={{ fontSize: 8 * scale, color: secondaryColor }}>
          <div>{SAMPLE_COMPANY.address}</div>
          <div>CIF: {SAMPLE_COMPANY.cif}</div>
          <div>{SAMPLE_COMPANY.email}</div>
        </div>
      </div>
    ));
  }, [sections.header, scale, primaryColor, secondaryColor, renderClickableSection]);

  const renderTitle = useCallback(() => {
    return renderClickableSection('title', sections.title.visible, (
      <div className="text-center" style={{ marginTop: sections.title.margin_top * scale }}>
        <div 
          className="font-bold"
          style={{ 
            fontSize: (sections.title.size || 28) * scale * 0.6, 
            color: primaryColor,
          }}
        >
          {config.title_text || documentLabels[documentType].toUpperCase()}
        </div>
        {/* Number below title (matches invoicePdf.ts lines 192-204) */}
        <div 
          style={{ 
            fontSize: 12 * scale, 
            color: secondaryColor,
            marginTop: 4 * scale,
          }}
        >
          Nº {documentType === 'invoice' ? 'FF-0042' : documentType === 'quote' ? 'PP-0015' : 'CT-0008'}
        </div>
      </div>
    ));
  }, [sections.title, scale, config.title_text, documentType, primaryColor, secondaryColor, renderClickableSection]);

  const renderDates = useCallback(() => {
    return renderClickableSection('dates', sections.dates.visible, (
      <div 
        className="flex gap-6"
        style={{ 
          marginTop: sections.dates.margin_top * scale,
          fontSize: 8 * scale,
        }}
      >
        <span><span style={{ color: secondaryColor }}>Fecha emisión:</span> <strong>11/01/2026</strong></span>
        <span><span style={{ color: secondaryColor }}>Vencimiento:</span> <strong>11/02/2026</strong></span>
      </div>
    ));
  }, [sections.dates, scale, secondaryColor, renderClickableSection]);

  const renderClient = useCallback(() => {
    return renderClickableSection('client', sections.client.visible, (
      <div 
        className="rounded"
        style={{ 
          marginTop: sections.client.margin_top * scale,
          padding: sections.client.padding * scale,
          backgroundColor: sections.client.background_color || '#f8f9fa',
        }}
      >
        {/* Label matches invoicePdf.ts line 283: "CLIENTE" */}
        <div style={{ fontSize: 7 * scale, color: secondaryColor, marginBottom: 4 * scale, fontWeight: 600 }}>
          CLIENTE
        </div>
        <div style={{ fontSize: 9 * scale, fontWeight: 600 }}>
          {SAMPLE_CLIENT.name}
        </div>
        <div style={{ fontSize: 8 * scale, color: '#666', marginTop: 2 * scale }}>
          {SAMPLE_CLIENT.address}
        </div>
        <div style={{ fontSize: 8 * scale, color: '#666' }}>
          CIF: {SAMPLE_CLIENT.cif}
        </div>
      </div>
    ));
  }, [sections.client, scale, secondaryColor, renderClickableSection]);

  const renderTable = useCallback(() => {
    return renderClickableSection('table', sections.table.visible, (
      <div style={{ marginTop: sections.table.margin_top * scale }}>
        {/* Table Header */}
        <div 
          className="flex text-white font-medium"
          style={{ 
            backgroundColor: config.table_header_color || primaryColor,
            height: sections.table.header_height * scale,
            fontSize: 7 * scale,
            padding: `0 ${6 * scale}px`,
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
              fontSize: 7 * scale,
              padding: `0 ${6 * scale}px`,
              alignItems: 'center',
              backgroundColor: idx % 2 === 1 ? '#fafafa' : 'transparent',
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
    ));
  }, [sections.table, scale, config.table_header_color, primaryColor, formatCurrency, renderClickableSection]);

  const renderTotals = useCallback(() => {
    return renderClickableSection('totals', sections.totals.visible, (
      <div 
        className="flex flex-col items-end"
        style={{ 
          marginTop: sections.totals.margin_top * scale,
          fontSize: 8 * scale,
        }}
      >
        <div className="flex justify-between" style={{ width: 110 * scale, marginBottom: 3 * scale }}>
          <span style={{ color: secondaryColor }}>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {sections.totals.show_lines && (
          <div 
            style={{ 
              width: 110 * scale, 
              height: 1, 
              backgroundColor: sections.totals.line_color || '#e5e7eb',
              marginBottom: 3 * scale,
            }} 
          />
        )}
        <div className="flex justify-between" style={{ width: 110 * scale, marginBottom: 3 * scale }}>
          <span style={{ color: secondaryColor }}>IVA (21%):</span>
          <span>{formatCurrency(iva)}</span>
        </div>
        {sections.totals.show_lines && (
          <div 
            style={{ 
              width: 110 * scale, 
              height: 1, 
              backgroundColor: sections.totals.line_color || '#e5e7eb',
              marginBottom: 3 * scale,
            }} 
          />
        )}
        <div 
          className="flex justify-between font-bold"
          style={{ width: 110 * scale, color: primaryColor, fontSize: 10 * scale }}
        >
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    ));
  }, [sections.totals, scale, secondaryColor, primaryColor, subtotal, iva, total, formatCurrency, renderClickableSection]);

  const renderNotes = useCallback(() => {
    if (!config.show_notes) return null;
    return renderClickableSection('notes', true, (
      <div style={{ marginTop: 12 * scale, fontSize: 7 * scale }}>
        <div style={{ color: secondaryColor, fontWeight: 600, marginBottom: 3 * scale }}>Observaciones:</div>
        <div style={{ color: '#666' }}>Gracias por confiar en nosotros.</div>
      </div>
    ));
  }, [config.show_notes, scale, secondaryColor, renderClickableSection]);

  const renderFooter = useCallback(() => {
    return renderClickableSection('footer', sections.footer.visible, (
      <div 
        className="text-center border-t pt-2"
        style={{ 
          marginTop: sections.footer.margin_top * scale,
          fontSize: 7 * scale,
          color: '#888',
        }}
      >
        <div>{SAMPLE_COMPANY.name} · {SAMPLE_COMPANY.address}</div>
        {sections.footer.show_iban && (
          <div style={{ marginTop: 3 * scale }}>IBAN: {SAMPLE_COMPANY.iban}</div>
        )}
      </div>
    ));
  }, [sections.footer, scale, renderClickableSection]);

  const renderLegal = useCallback(() => {
    if (documentType !== 'contract') return null;
    return renderClickableSection('legal', sections.legal?.visible ?? true, (
      <div style={{ marginTop: 16 * scale, fontSize: 7 * scale }}>
        <div style={{ fontWeight: 600, marginBottom: 4 * scale }}>CLÁUSULAS</div>
        <div style={{ color: '#666', fontSize: 6 * scale }}>
          <div style={{ marginBottom: 3 * scale }}><strong>PRIMERA - OBJETO:</strong> El prestador se compromete...</div>
          <div><strong>SEGUNDA - DURACIÓN:</strong> El contrato tendrá la duración...</div>
        </div>
      </div>
    ));
  }, [documentType, sections.legal, scale, renderClickableSection]);

  const renderSignatures = useCallback(() => {
    if (documentType !== 'contract') return null;
    return renderClickableSection('signatures', sections.signatures?.visible ?? true, (
      <div style={{ marginTop: 20 * scale, display: 'flex', justifyContent: 'space-between' }}>
        <div className="text-center" style={{ width: '40%' }}>
          <div style={{ borderBottom: `1px solid #333`, width: '100%', height: 30 * scale }} />
          <div style={{ fontSize: 7 * scale, marginTop: 4 * scale, color: '#666' }}>El Prestador</div>
        </div>
        <div className="text-center" style={{ width: '40%' }}>
          <div style={{ borderBottom: `1px solid #333`, width: '100%', height: 30 * scale }} />
          <div style={{ fontSize: 7 * scale, marginTop: 4 * scale, color: '#666' }}>El Cliente</div>
        </div>
      </div>
    ));
  }, [documentType, sections.signatures, scale, renderClickableSection]);

  // Map of section renderers
  const sectionRenderers: Record<BlockType, () => React.ReactNode> = useMemo(() => ({
    header: renderHeader,
    title: renderTitle,
    dates: renderDates,
    client: renderClient,
    table: renderTable,
    totals: renderTotals,
    notes: renderNotes,
    footer: renderFooter,
    legal: renderLegal,
    signatures: renderSignatures,
  }), [renderHeader, renderTitle, renderDates, renderClient, renderTable, renderTotals, renderNotes, renderFooter, renderLegal, renderSignatures]);

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
          {/* Render sections in order */}
          {sectionOrder
            .filter(id => id !== 'footer') // Footer always last
            .map(sectionId => sectionRenderers[sectionId]?.())}
          
          {/* Footer always at the end */}
          {sectionRenderers.footer()}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Vista previa con datos de ejemplo
        </p>
      </CardContent>
    </Card>
  );
}