import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// A4 dimensions in points (72 points per inch)
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MARGIN = 50;

export interface PdfColors {
  primary: ReturnType<typeof rgb>;
  secondary: ReturnType<typeof rgb>;
  text: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
  white: ReturnType<typeof rgb>;
}

export const colors: PdfColors = {
  primary: rgb(0.2, 0.4, 0.8),
  secondary: rgb(0.4, 0.4, 0.4),
  text: rgb(0, 0, 0),
  muted: rgb(0.5, 0.5, 0.5),
  border: rgb(0.8, 0.8, 0.8),
  white: rgb(1, 1, 1),
};

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
  fonts: PdfFonts
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
      size: 9,
      font: fonts.bold,
      color: colors.text,
    });
  });
  
  return y - headerHeight - 5;
}

export function drawTableRow(
  page: PDFPage,
  y: number,
  values: { text: string; x: number }[],
  fonts: PdfFonts,
  isAlternate = false
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
      size: 9,
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
}

export function drawCompanyHeader(
  page: PDFPage,
  company: CompanyData,
  fonts: PdfFonts,
  startY: number
): number {
  let y = startY;
  
  // Company name
  page.drawText(company.name || 'Mi Empresa', {
    x: MARGIN,
    y,
    size: 18,
    font: fonts.bold,
    color: colors.primary,
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
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
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
  startY: number
): number {
  let y = startY;
  
  page.drawText('CLIENTE', {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.bold,
    color: colors.muted,
  });
  y -= 16;
  
  page.drawText(client.name || '', {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: colors.text,
  });
  y -= 14;
  
  if (client.cif) {
    page.drawText(`CIF: ${client.cif}`, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
    });
    y -= 12;
  }
  
  if (client.address) {
    page.drawText(client.address, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
    });
    y -= 12;
  }
  
  if (client.city || client.postal_code) {
    page.drawText([client.postal_code, client.city].filter(Boolean).join(' '), {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
    });
    y -= 12;
  }
  
  if (client.email) {
    page.drawText(client.email, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
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
  y: number
): void {
  const rightX = A4_WIDTH - MARGIN;
  
  page.drawText(title, {
    x: rightX - fonts.bold.widthOfTextAtSize(`${title} #${number}`, 16),
    y: y + 20,
    size: 16,
    font: fonts.bold,
    color: colors.primary,
  });
  
  page.drawText(`#${number}`, {
    x: rightX - fonts.bold.widthOfTextAtSize(`#${number}`, 20),
    y: y - 5,
    size: 20,
    font: fonts.bold,
    color: colors.text,
  });
}

export function drawTotals(
  page: PDFPage,
  subtotal: number,
  ivaAmount: number,
  total: number,
  fonts: PdfFonts,
  startY: number,
  ivaPercent?: number
): number {
  let y = startY;
  const rightX = A4_WIDTH - MARGIN;
  const labelX = rightX - 150;
  
  // Subtotal
  page.drawText('Subtotal:', {
    x: labelX,
    y,
    size: 10,
    font: fonts.regular,
    color: colors.secondary,
  });
  page.drawText(formatCurrency(subtotal), {
    x: rightX - fonts.regular.widthOfTextAtSize(formatCurrency(subtotal), 10),
    y,
    size: 10,
    font: fonts.regular,
    color: colors.text,
  });
  y -= 18;
  
  // IVA
  const ivaLabel = ivaPercent ? `IVA (${ivaPercent}%):` : 'IVA:';
  page.drawText(ivaLabel, {
    x: labelX,
    y,
    size: 10,
    font: fonts.regular,
    color: colors.secondary,
  });
  page.drawText(formatCurrency(ivaAmount), {
    x: rightX - fonts.regular.widthOfTextAtSize(formatCurrency(ivaAmount), 10),
    y,
    size: 10,
    font: fonts.regular,
    color: colors.text,
  });
  y -= 20;
  
  // Line before total
  drawLine(page, labelX, y + 8, rightX, y + 8, colors.border, 1);
  
  // Total
  page.drawText('TOTAL:', {
    x: labelX,
    y,
    size: 12,
    font: fonts.bold,
    color: colors.text,
  });
  page.drawText(formatCurrency(total), {
    x: rightX - fonts.bold.widthOfTextAtSize(formatCurrency(total), 14),
    y,
    size: 14,
    font: fonts.bold,
    color: colors.primary,
  });
  
  return y - 30;
}

export function drawFooter(
  page: PDFPage,
  company: CompanyData,
  fonts: PdfFonts
): void {
  const y = 40;
  
  drawLine(page, MARGIN, y + 20, A4_WIDTH - MARGIN, y + 20, colors.border, 0.5);
  
  const footerText = company.iban 
    ? `IBAN: ${company.iban}`
    : company.name || '';
  
  const textWidth = fonts.regular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: (A4_WIDTH - textWidth) / 2,
    y,
    size: 8,
    font: fonts.regular,
    color: colors.muted,
  });
}
