import { PdfSections, LegalClause, BlockType } from '@/lib/pdf/pdfUtils';

// Re-export BlockType from pdfUtils for convenience
export type { BlockType };

// Constraints for block movement
export interface BlockConstraints {
  mustBeFirst?: boolean;
  mustBeLast?: boolean;
  mustBeAfter?: BlockType[];
}

// A draggable block in the editor
export interface PdfBlock {
  id: BlockType;
  label: string;
  icon: string;
  visible: boolean;
  locked?: boolean; // Cannot be moved (e.g., footer always at end)
  order: number;
  constraints?: BlockConstraints;
}

// Section configuration for property panel
export interface SectionProperty {
  key: string;
  label: string;
  type: 'slider' | 'color' | 'switch' | 'number';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Get default blocks for a document type
export function getDefaultBlocks(documentType: 'invoice' | 'quote' | 'contract'): PdfBlock[] {
  const baseBlocks: PdfBlock[] = [
    { id: 'header', label: 'Cabecera', icon: 'Building2', visible: true, order: 0, locked: true, constraints: { mustBeFirst: true } },
    { id: 'title', label: 'Título', icon: 'FileText', visible: true, order: 1 },
    { id: 'dates', label: 'Fechas', icon: 'Calendar', visible: true, order: 2 },
    { id: 'client', label: 'Cliente', icon: 'User', visible: true, order: 3 },
    { id: 'table', label: 'Servicios', icon: 'Table2', visible: true, order: 4 },
    { id: 'totals', label: 'Totales', icon: 'DollarSign', visible: true, order: 5, constraints: { mustBeAfter: ['table'] } },
  ];

  if (documentType === 'contract') {
    return [
      ...baseBlocks,
      { id: 'notes', label: 'Notas', icon: 'StickyNote', visible: true, order: 6 },
      { id: 'legal', label: 'Cláusulas', icon: 'Scale', visible: true, order: 7 },
      { id: 'signatures', label: 'Firmas', icon: 'PenTool', visible: true, order: 8 },
      { id: 'footer', label: 'Pie', icon: 'FileSignature', visible: true, locked: true, order: 9, constraints: { mustBeLast: true } },
    ];
  }

  return [
    ...baseBlocks,
    { id: 'notes', label: 'Notas', icon: 'StickyNote', visible: true, order: 6 },
    { id: 'footer', label: 'Pie', icon: 'FileSignature', visible: true, locked: true, order: 7, constraints: { mustBeLast: true } },
  ];
}

// Get section order from blocks
export function getOrderFromBlocks(blocks: PdfBlock[]): BlockType[] {
  return [...blocks]
    .sort((a, b) => a.order - b.order)
    .map(b => b.id);
}

// Create blocks from section order
export function getBlocksFromOrder(
  sectionOrder: BlockType[], 
  documentType: 'invoice' | 'quote' | 'contract'
): PdfBlock[] {
  const defaultBlocks = getDefaultBlocks(documentType);
  const blockMap = new Map(defaultBlocks.map(b => [b.id, b]));
  
  return sectionOrder
    .filter(id => blockMap.has(id))
    .map((id, index) => ({
      ...blockMap.get(id)!,
      order: index,
    }));
}

// Get section properties for the property panel
export function getSectionProperties(blockId: BlockType): SectionProperty[] {
  switch (blockId) {
    case 'header':
      return [
        { key: 'spacing', label: 'Espaciado interno', type: 'slider', min: 4, max: 20, unit: 'px' },
        { key: 'logo_size', label: 'Tamaño máximo logo', type: 'slider', min: 30, max: 100, unit: 'px' },
        { key: 'company_name_size', label: 'Tamaño nombre empresa', type: 'slider', min: 12, max: 24, unit: 'px' },
      ];
    case 'title':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 5, max: 50, unit: 'px' },
        { key: 'spacing', label: 'Espaciado tras título', type: 'slider', min: 5, max: 30, unit: 'px' },
        { key: 'size', label: 'Tamaño de fuente', type: 'slider', min: 18, max: 40, unit: 'px' },
      ];
    case 'dates':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 5, max: 40, unit: 'px' },
        { key: 'spacing', label: 'Espaciado interno', type: 'slider', min: 5, max: 20, unit: 'px' },
      ];
    case 'client':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 5, max: 50, unit: 'px' },
        { key: 'padding', label: 'Padding interno', type: 'slider', min: 8, max: 30, unit: 'px' },
        { key: 'spacing', label: 'Espaciado líneas', type: 'slider', min: 10, max: 22, unit: 'px' },
        { key: 'background_color', label: 'Color de fondo', type: 'color' },
      ];
    case 'table':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 10, max: 50, unit: 'px' },
        { key: 'header_height', label: 'Altura cabecera', type: 'slider', min: 18, max: 40, unit: 'px' },
        { key: 'row_height', label: 'Altura de filas', type: 'slider', min: 16, max: 36, unit: 'px' },
        { key: 'show_borders', label: 'Mostrar bordes', type: 'switch' },
        { key: 'border_color', label: 'Color de bordes', type: 'color' },
      ];
    case 'totals':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 5, max: 40, unit: 'px' },
        { key: 'line_spacing', label: 'Espaciado líneas', type: 'slider', min: 14, max: 40, unit: 'px' },
        { key: 'show_lines', label: 'Líneas separadoras', type: 'switch' },
        { key: 'line_color', label: 'Color de líneas', type: 'color' },
      ];
    case 'legal':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 10, max: 60, unit: 'px' },
        { key: 'clause_spacing', label: 'Espaciado cláusulas', type: 'slider', min: 10, max: 40, unit: 'px' },
        { key: 'title_size', label: 'Tamaño título', type: 'slider', min: 8, max: 14, unit: 'px' },
      ];
    case 'signatures':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 20, max: 100, unit: 'px' },
        { key: 'line_width', label: 'Ancho línea firma', type: 'slider', min: 120, max: 220, unit: 'px' },
        { key: 'label_size', label: 'Tamaño etiqueta', type: 'slider', min: 7, max: 12, unit: 'px' },
      ];
    case 'footer':
      return [
        { key: 'margin_top', label: 'Margen superior', type: 'slider', min: 20, max: 80, unit: 'px' },
        { key: 'spacing', label: 'Espaciado líneas', type: 'slider', min: 8, max: 20, unit: 'px' },
        { key: 'show_iban', label: 'Mostrar IBAN', type: 'switch' },
      ];
    default:
      return [];
  }
}
