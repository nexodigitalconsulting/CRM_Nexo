import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// A4 dimensions in points (72 points per inch)
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MARGIN = 50;

// Section configuration for individual PDF areas
export interface PdfSectionConfig {
  margin_top: number;      // Distance from previous section
  spacing: number;         // Internal spacing
  visible: boolean;        // Show/hide section
}

export interface PdfHeaderSection extends PdfSectionConfig {
  logo_size?: number;      // Logo max height (40-80)
}

export interface PdfTitleSection extends PdfSectionConfig {
  text?: string;           // Custom title text
  size?: number;           // Title font size
}

export interface PdfDatesSection extends PdfSectionConfig {}

export interface PdfClientSection extends PdfSectionConfig {
  padding: number;         // Internal padding
  background_color?: string;
  show_border?: boolean;   // Show border around client box
  border_color?: string;   // Border color
}

export interface PdfTableSection extends PdfSectionConfig {
  row_height: number;      // Row height
  header_height: number;   // Header row height
  show_borders: boolean;   // Show row dividers
  border_color?: string;   // Border color
}

export interface PdfTotalsSection extends PdfSectionConfig {
  line_spacing: number;    // Spacing between total lines
  show_lines: boolean;     // Show separator lines
  line_color?: string;     // Separator line color
}

export interface PdfFooterSection extends PdfSectionConfig {
  show_iban: boolean;      // Show IBAN in footer
}

// Contract-specific sections
export interface PdfLegalSection extends PdfSectionConfig {
  clause_spacing: number;  // Spacing between clauses
  title_size?: number;     // Clause title font size
}

export interface PdfSignaturesSection extends PdfSectionConfig {
  line_width: number;      // Width of signature line
  label_size?: number;     // Label font size
}

// Legal clause structure for contracts
export interface LegalClause {
  id: string;
  number: string;          // "PRIMERA", "SEGUNDA", etc.
  title: string;           // "OBJETO DEL CONTRATO"
  content: string;         // Clause body text (supports {{variables}})
  visible: boolean;
}

// Replace variables in clause content
export function replaceClauseVariables(
  content: string,
  data: Record<string, string | undefined | null>
): string {
  let result = content;
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });
  // Clean up any remaining unmatched variables
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  return result;
}

// Default legal clauses for contracts
export const DEFAULT_LEGAL_CLAUSES: LegalClause[] = [
  {
    id: 'objeto',
    number: 'PRIMERA',
    title: 'OBJETO DEL CONTRATO',
    content: 'El prestador se compromete a proporcionar al cliente los servicios detallados en el presente contrato, conforme a las condiciones aquí establecidas.',
    visible: true,
  },
  {
    id: 'duracion',
    number: 'SEGUNDA',
    title: 'DURACIÓN Y VIGENCIA',
    content: 'El contrato tendrá la duración especificada, pudiendo ser renovado de mutuo acuerdo entre las partes.',
    visible: true,
  },
  {
    id: 'precio',
    number: 'TERCERA',
    title: 'PRECIO Y FORMA DE PAGO',
    content: 'El cliente abonará al prestador el importe total acordado según la periodicidad de facturación establecida, mediante transferencia bancaria.',
    visible: true,
  },
  {
    id: 'obligaciones',
    number: 'CUARTA',
    title: 'OBLIGACIONES DE LAS PARTES',
    content: 'Ambas partes se comprometen al cumplimiento de las obligaciones derivadas del presente contrato, actuando de buena fe.',
    visible: true,
  },
  {
    id: 'proteccion_datos',
    number: 'QUINTA',
    title: 'PROTECCIÓN DE DATOS',
    content: 'Las partes se comprometen a cumplir con la normativa vigente en materia de protección de datos personales.',
    visible: true,
  },
  {
    id: 'resolucion',
    number: 'SEXTA',
    title: 'RESOLUCIÓN',
    content: 'Cualquiera de las partes podrá resolver el contrato mediante comunicación escrita con un preaviso de 30 días.',
    visible: true,
  },
  {
    id: 'jurisdiccion',
    number: 'SÉPTIMA',
    title: 'JURISDICCIÓN',
    content: 'Para cualquier controversia derivada del presente contrato, las partes se someten a los juzgados y tribunales de la ciudad correspondiente.',
    visible: false,
  },
];

export interface PdfSections {
  header: PdfHeaderSection;
  title: PdfTitleSection;
  dates: PdfDatesSection;
  client: PdfClientSection;
  table: PdfTableSection;
  totals: PdfTotalsSection;
  footer: PdfFooterSection;
  // Contract-specific sections
  legal?: PdfLegalSection;
  signatures?: PdfSignaturesSection;
}

// Default section values
export function getDefaultSections(): PdfSections {
  return {
    header: { margin_top: 0, spacing: 8, visible: true, logo_size: 60 },
    title: { margin_top: 20, spacing: 16, visible: true, size: 28 },
    dates: { margin_top: 22, spacing: 10, visible: true },
    client: { margin_top: 20, spacing: 14, visible: true, padding: 14, background_color: '#f8f9fa' },
    table: { margin_top: 28, spacing: 0, visible: true, row_height: 22, header_height: 24, show_borders: true, border_color: '#e5e7eb' },
    totals: { margin_top: 10, spacing: 0, visible: true, line_spacing: 22, show_lines: true, line_color: '#e5e7eb' },
    footer: { margin_top: 40, spacing: 12, visible: true, show_iban: true },
    // Contract-specific defaults
    legal: { margin_top: 30, spacing: 12, visible: true, clause_spacing: 20, title_size: 10 },
    signatures: { margin_top: 50, spacing: 8, visible: true, line_width: 180, label_size: 9 },
  };
}

// PDF Configuration interface matching pdf_settings table
export interface PdfConfig {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  show_logo?: boolean;
  logo_position?: 'left' | 'center' | 'right';
  show_iban_footer?: boolean;
  show_notes?: boolean;
  show_discounts_column?: boolean;
  header_style?: 'classic' | 'modern' | 'minimal';
  font_size_base?: number;
  // Extended configurable parameters
  title_text?: string;              // "FACTURA", "INVOICE", etc.
  title_size?: number;              // 24-36
  title_color?: string;             // Color for title (defaults to primary_color)
  client_box_color?: string;        // Background color for client box (e.g., "#f1f5f9")
  table_header_color?: string;      // Background color for table header
  show_footer_legal?: boolean;      // Show legal footer text
  footer_legal_lines?: string[];    // Lines of legal text for footer
  // Spacing parameters
  line_spacing?: number;            // Spacing between text lines (12-20, default: 14)
  section_spacing?: number;         // Space between sections (20-40, default: 28)
  row_height?: number;              // Table row height (18-30, default: 22)
  client_box_padding?: number;      // Client box padding (10-25, default: 14)
  margins?: number;                 // Document margins (40-70, default: 50)

  // Table borders
  show_table_borders?: boolean;     // Show table row dividers (default: true)
  table_border_color?: string;      // Table border color (default: #e5e7eb)

  // Totals section
  show_totals_lines?: boolean;      // Show separator lines in totals block (default: true)
  totals_line_color?: string;       // Totals separator color (default: border)

  // Section-based configuration (NEW)
  sections?: PdfSections;

  // Contract-specific configuration
  legal_clauses?: LegalClause[];
  show_signatures?: boolean;
}

export interface PdfColors {
  primary: ReturnType<typeof rgb>;
  secondary: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  text: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
  white: ReturnType<typeof rgb>;
}

// Convert hex color to rgb values (0-1)
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 0.2, g: 0.4, b: 0.8 }; // Default blue
}

// Create colors from config
export function createColorsFromConfig(config?: PdfConfig): PdfColors {
  const primaryHex = config?.primary_color || '#3366cc';
  const secondaryHex = config?.secondary_color || '#666666';
  const accentHex = config?.accent_color || '#0066cc';
  
  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);
  const accent = hexToRgb(accentHex);
  
  return {
    primary: rgb(primary.r, primary.g, primary.b),
    secondary: rgb(secondary.r, secondary.g, secondary.b),
    accent: rgb(accent.r, accent.g, accent.b),
    text: rgb(0, 0, 0),
    muted: rgb(0.5, 0.5, 0.5),
    border: rgb(0.8, 0.8, 0.8),
    white: rgb(1, 1, 1),
  };
}

// Default colors (for backward compatibility)
export const colors: PdfColors = createColorsFromConfig();

export interface PdfFonts {
  regular: PDFFont;
  bold: PDFFont;
}

export async function createPdfDocument(): Promise<PDFDocument> {
  return PDFDocument.create();
}

export async function embedFonts(pdfDoc: PDFDocument): Promise<PdfFonts> {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { regular, bold };
}

export function addPage(pdfDoc: PDFDocument): PDFPage {
  return pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
}

// Embed logo from URL with configurable max dimensions
export async function embedLogo(
  pdfDoc: PDFDocument,
  logoUrl: string | null | undefined,
  maxHeight: number = 60,
  maxWidth: number = 150
): Promise<{ image: Awaited<ReturnType<typeof pdfDoc.embedPng | typeof pdfDoc.embedJpg>>; width: number; height: number } | null> {
  if (!logoUrl) return null;
  
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to determine image type from URL or content
    const isPng = logoUrl.toLowerCase().includes('.png') || 
      (uint8Array[0] === 0x89 && uint8Array[1] === 0x50);
    
    let image;
    if (isPng) {
      image = await pdfDoc.embedPng(uint8Array);
    } else {
      image = await pdfDoc.embedJpg(uint8Array);
    }
    
    // Calculate dimensions using configurable max values
    const aspectRatio = image.width / image.height;
    
    let width = image.width;
    let height = image.height;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    return { image, width, height };
  } catch (error) {
    console.error('Error embedding logo:', error);
    return null;
  }
}

// Draw logo on page
export function drawLogo(
  page: PDFPage,
  logo: { image: any; width: number; height: number },
  position: 'left' | 'center' | 'right',
  y: number
): void {
  let x = MARGIN;
  
  if (position === 'center') {
    x = (A4_WIDTH - logo.width) / 2;
  } else if (position === 'right') {
    x = A4_WIDTH - MARGIN - logo.width;
  }
  
  page.drawImage(logo.image, {
    x,
    y: y - logo.height,
    width: logo.width,
    height: logo.height,
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0,00 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function drawLine(
  page: PDFPage,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color = colors.border,
  thickness = 1
): void {
  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    thickness,
    color,
  });
}

// Draw table header with configurable height and background color
export function drawTableHeader(
  page: PDFPage,
  y: number,
  columns: { label: string; x: number; width: number }[],
  fonts: PdfFonts,
  pdfColors: PdfColors = colors,
  fontSize: number = 9,
  headerHeight: number = 25,
  backgroundColor?: { r: number; g: number; b: number }
): number {
  // Use provided background color or default gray
  const bgColor = backgroundColor || { r: 0.95, g: 0.95, b: 0.95 };
  
  // Background
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 5,
    width: A4_WIDTH - MARGIN * 2,
    height: headerHeight,
    color: rgb(bgColor.r, bgColor.g, bgColor.b),
  });
  
  // Header text
  columns.forEach((col) => {
    page.drawText(col.label, {
      x: col.x,
      y: y - 12,
      size: fontSize,
      font: fonts.bold,
      color: pdfColors.text,
    });
  });
  
  return y - headerHeight - 5;
}

// Draw table row with configurable height
export function drawTableRow(
  page: PDFPage,
  y: number,
  values: { text: string; x: number }[],
  fonts: PdfFonts,
  isAlternate = false,
  fontSize: number = 9,
  rowHeight: number = 20
): number {
  if (isAlternate) {
    page.drawRectangle({
      x: MARGIN,
      y: y - rowHeight + 5,
      width: A4_WIDTH - MARGIN * 2,
      height: rowHeight,
      color: rgb(0.98, 0.98, 0.98),
    });
  }
  
  values.forEach((val) => {
    page.drawText(val.text, {
      x: val.x,
      y: y - 12,
      size: fontSize,
      font: fonts.regular,
      color: colors.text,
    });
  });
  
  return y - rowHeight;
}

export async function pdfToBlob(pdfDoc: PDFDocument): Promise<Blob> {
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CompanyData {
  name: string;
  cif?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  iban?: string | null;
  logo_url?: string | null;
}

export async function drawCompanyHeaderWithLogo(
  pdfDoc: PDFDocument,
  page: PDFPage,
  company: CompanyData,
  fonts: PdfFonts,
  startY: number,
  config?: PdfConfig
): Promise<number> {
  let y = startY;
  const pdfColors = createColorsFromConfig(config);
  const fontSize = config?.font_size_base || 10;
  const showLogo = config?.show_logo !== false;
  const logoPosition = config?.logo_position || 'left';
  
  // Embed and draw logo if enabled
  if (showLogo && company.logo_url) {
    const logo = await embedLogo(pdfDoc, company.logo_url);
    if (logo) {
      drawLogo(page, logo, logoPosition, y);
      if (logoPosition === 'left') {
        // Move company text to the right of logo
        y -= logo.height + 10;
      }
    }
  }
  
  // Company name
  page.drawText(company.name || 'Mi Empresa', {
    x: MARGIN,
    y,
    size: 18,
    font: fonts.bold,
    color: pdfColors.primary,
  });
  y -= 20;
  
  // Company details
  const details: string[] = [];
  if (company.cif) details.push(`CIF: ${company.cif}`);
  if (company.address) details.push(company.address);
  if (company.city || company.postal_code) {
    details.push([company.postal_code, company.city].filter(Boolean).join(' '));
  }
  if (company.phone) details.push(`Tel: ${company.phone}`);
  if (company.email) details.push(company.email);
  
  details.forEach((detail) => {
    page.drawText(detail, {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 14;
  });
  
  return y - 10;
}

// Legacy function for backward compatibility
export function drawCompanyHeader(
  page: PDFPage,
  company: CompanyData,
  fonts: PdfFonts,
  startY: number,
  pdfColors: PdfColors = colors,
  fontSize: number = 10
): number {
  let y = startY;
  
  // Company name
  page.drawText(company.name || 'Mi Empresa', {
    x: MARGIN,
    y,
    size: 18,
    font: fonts.bold,
    color: pdfColors.primary,
  });
  y -= 20;
  
  // Company details
  const details: string[] = [];
  if (company.cif) details.push(`CIF: ${company.cif}`);
  if (company.address) details.push(company.address);
  if (company.city || company.postal_code) {
    details.push([company.postal_code, company.city].filter(Boolean).join(' '));
  }
  if (company.phone) details.push(`Tel: ${company.phone}`);
  if (company.email) details.push(company.email);
  
  details.forEach((detail) => {
    page.drawText(detail, {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 14;
  });
  
  return y - 10;
}

export interface ClientData {
  name: string;
  cif?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  email?: string | null;
}

export function drawClientSection(
  page: PDFPage,
  client: ClientData,
  fonts: PdfFonts,
  startY: number,
  pdfColors: PdfColors = colors,
  fontSize: number = 10
): number {
  let y = startY;
  
  page.drawText('CLIENTE', {
    x: MARGIN,
    y,
    size: fontSize,
    font: fonts.bold,
    color: pdfColors.muted,
  });
  y -= 16;
  
  page.drawText(client.name || '', {
    x: MARGIN,
    y,
    size: fontSize + 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  y -= 14;
  
  if (client.cif) {
    page.drawText(`CIF: ${client.cif}`, {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 12;
  }
  
  if (client.address) {
    page.drawText(client.address, {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 12;
  }
  
  if (client.city || client.postal_code) {
    page.drawText([client.postal_code, client.city].filter(Boolean).join(' '), {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 12;
  }
  
  if (client.email) {
    page.drawText(client.email, {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 12;
  }
  
  return y - 10;
}

export function drawDocumentTitle(
  page: PDFPage,
  title: string,
  number: string | number,
  fonts: PdfFonts,
  y: number,
  pdfColors: PdfColors = colors
): void {
  const rightX = A4_WIDTH - MARGIN;
  
  page.drawText(title, {
    x: rightX - fonts.bold.widthOfTextAtSize(`${title} #${number}`, 16),
    y: y + 20,
    size: 16,
    font: fonts.bold,
    color: pdfColors.primary,
  });
  
  page.drawText(`#${number}`, {
    x: rightX - fonts.bold.widthOfTextAtSize(`#${number}`, 20),
    y: y - 5,
    size: 20,
    font: fonts.bold,
    color: pdfColors.text,
  });
}

export function drawTotals(
  page: PDFPage,
  subtotal: number,
  ivaAmount: number,
  total: number,
  fonts: PdfFonts,
  startY: number,
  ivaPercent?: number,
  pdfColors: PdfColors = colors,
  fontSize: number = 10
): number {
  let y = startY;
  const rightX = A4_WIDTH - MARGIN;
  const labelX = rightX - 150;
  
  // Subtotal
  page.drawText('Subtotal:', {
    x: labelX,
    y,
    size: fontSize,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  page.drawText(formatCurrency(subtotal), {
    x: rightX - fonts.regular.widthOfTextAtSize(formatCurrency(subtotal), fontSize),
    y,
    size: fontSize,
    font: fonts.regular,
    color: pdfColors.text,
  });
  y -= 18;
  
  // IVA
  const ivaLabel = ivaPercent ? `IVA (${ivaPercent}%):` : 'IVA:';
  page.drawText(ivaLabel, {
    x: labelX,
    y,
    size: fontSize,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  page.drawText(formatCurrency(ivaAmount), {
    x: rightX - fonts.regular.widthOfTextAtSize(formatCurrency(ivaAmount), fontSize),
    y,
    size: fontSize,
    font: fonts.regular,
    color: pdfColors.text,
  });
  y -= 20;
  
  // Line before total
  drawLine(page, labelX, y + 8, rightX, y + 8, pdfColors.border, 1);
  
  // Total
  page.drawText('TOTAL:', {
    x: labelX,
    y,
    size: fontSize + 2,
    font: fonts.bold,
    color: pdfColors.text,
  });
  page.drawText(formatCurrency(total), {
    x: rightX - fonts.bold.widthOfTextAtSize(formatCurrency(total), fontSize + 4),
    y,
    size: fontSize + 4,
    font: fonts.bold,
    color: pdfColors.primary,
  });
  
  return y - 30;
}

export function drawFooter(
  page: PDFPage,
  company: CompanyData,
  fonts: PdfFonts,
  showIban: boolean = true,
  pdfColors: PdfColors = colors,
  pageInfo?: { current: number; total: number }
): void {
  const y = 40;
  
  drawLine(page, MARGIN, y + 20, A4_WIDTH - MARGIN, y + 20, pdfColors.border, 0.5);
  
  // Page number on the right
  if (pageInfo && pageInfo.total > 1) {
    const pageText = `Página ${pageInfo.current} de ${pageInfo.total}`;
    const pageTextWidth = fonts.regular.widthOfTextAtSize(pageText, 8);
    page.drawText(pageText, {
      x: A4_WIDTH - MARGIN - pageTextWidth,
      y,
      size: 8,
      font: fonts.regular,
      color: pdfColors.muted,
    });
  }
  
  const footerText = (showIban && company.iban)
    ? `IBAN: ${company.iban}`
    : company.name || '';
  
  const textWidth = fonts.regular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: (A4_WIDTH - textWidth) / 2,
    y,
    size: 8,
    font: fonts.regular,
    color: pdfColors.muted,
  });
}

// ============ CONTRACT-SPECIFIC FUNCTIONS ============

/**
 * Wrap text to fit within a maximum width
 */
export function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draw a legal clause with title and wrapped content
 */
export function drawLegalClause(
  page: PDFPage,
  clause: LegalClause,
  fonts: PdfFonts,
  startY: number,
  pdfColors: PdfColors = colors,
  config?: { titleSize?: number; contentSize?: number; maxWidth?: number }
): number {
  const titleSize = config?.titleSize || 10;
  const contentSize = config?.contentSize || 9;
  const maxWidth = config?.maxWidth || (A4_WIDTH - MARGIN * 2);
  
  let y = startY;
  
  // Draw clause title: "PRIMERA - OBJETO DEL CONTRATO"
  const titleText = `${clause.number} - ${clause.title}`;
  page.drawText(titleText, {
    x: MARGIN,
    y,
    size: titleSize,
    font: fonts.bold,
    color: pdfColors.text,
  });
  y -= 14;
  
  // Draw wrapped content
  const lines = wrapText(clause.content, fonts.regular, contentSize, maxWidth);
  lines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: contentSize,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    y -= 12;
  });
  
  return y;
}

/**
 * Draw all visible legal clauses
 */
export function drawLegalClauses(
  page: PDFPage,
  clauses: LegalClause[],
  fonts: PdfFonts,
  startY: number,
  pdfColors: PdfColors = colors,
  config?: { clauseSpacing?: number; titleSize?: number; contentSize?: number }
): number {
  const clauseSpacing = config?.clauseSpacing || 20;
  const visibleClauses = clauses.filter(c => c.visible);
  
  let y = startY;
  
  // Section title
  page.drawText('CLÁUSULAS', {
    x: MARGIN,
    y,
    size: 12,
    font: fonts.bold,
    color: pdfColors.primary,
  });
  y -= 20;
  
  // Draw each clause
  visibleClauses.forEach((clause, index) => {
    y = drawLegalClause(page, clause, fonts, y, pdfColors, {
      titleSize: config?.titleSize,
      contentSize: config?.contentSize,
    });
    
    // Add spacing between clauses (not after last)
    if (index < visibleClauses.length - 1) {
      y -= clauseSpacing;
    }
  });
  
  return y;
}

/**
 * Draw signature area for contracts
 */
export function drawSignatureArea(
  page: PDFPage,
  fonts: PdfFonts,
  startY: number,
  pdfColors: PdfColors = colors,
  config?: { lineWidth?: number; labelSize?: number; companyName?: string; clientName?: string }
): number {
  const lineWidth = config?.lineWidth || 180;
  const labelSize = config?.labelSize || 9;
  const companyLabel = config?.companyName || 'El Prestador';
  const clientLabel = config?.clientName || 'El Cliente';
  
  let y = startY;
  const contentWidth = A4_WIDTH - MARGIN * 2;
  const spacing = (contentWidth - lineWidth * 2) / 3;
  
  const leftX = MARGIN + spacing;
  const rightX = A4_WIDTH - MARGIN - spacing - lineWidth;
  
  // Signature lines
  drawLine(page, leftX, y, leftX + lineWidth, y, pdfColors.text, 0.5);
  drawLine(page, rightX, y, rightX + lineWidth, y, pdfColors.text, 0.5);
  
  y -= 12;
  
  // Labels
  const leftLabelWidth = fonts.regular.widthOfTextAtSize(companyLabel, labelSize);
  const rightLabelWidth = fonts.regular.widthOfTextAtSize(clientLabel, labelSize);
  
  page.drawText(companyLabel, {
    x: leftX + (lineWidth - leftLabelWidth) / 2,
    y,
    size: labelSize,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  
  page.drawText(clientLabel, {
    x: rightX + (lineWidth - rightLabelWidth) / 2,
    y,
    size: labelSize,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  
  return y - 20;
}
