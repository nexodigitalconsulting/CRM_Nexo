import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// A4 dimensions in points (72 points per inch)
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MARGIN = 50;

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

// Embed logo from URL
export async function embedLogo(
  pdfDoc: PDFDocument,
  logoUrl: string | null | undefined
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
    
    // Calculate dimensions - max height 60, maintain aspect ratio
    const maxHeight = 60;
    const maxWidth = 150;
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

export function drawTableHeader(
  page: PDFPage,
  y: number,
  columns: { label: string; x: number; width: number }[],
  fonts: PdfFonts,
  pdfColors: PdfColors = colors,
  fontSize: number = 9
): number {
  const headerHeight = 25;
  
  // Background
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 5,
    width: A4_WIDTH - MARGIN * 2,
    height: headerHeight,
    color: rgb(0.95, 0.95, 0.95),
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

export function drawTableRow(
  page: PDFPage,
  y: number,
  values: { text: string; x: number }[],
  fonts: PdfFonts,
  isAlternate = false,
  fontSize: number = 9
): number {
  const rowHeight = 20;
  
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
  pdfColors: PdfColors = colors
): void {
  const y = 40;
  
  drawLine(page, MARGIN, y + 20, A4_WIDTH - MARGIN, y + 20, pdfColors.border, 0.5);
  
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
