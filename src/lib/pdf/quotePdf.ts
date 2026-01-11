import { rgb } from 'pdf-lib';
import {
  createPdfDocument,
  embedFonts,
  addPage,
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
  createColorsFromConfig,
  hexToRgb,
  formatCurrency,
  formatDate,
  drawLine,
  pdfToBlob,
  blobToBase64,
  downloadBlob,
  embedLogo,
  drawLogo,
  CompanyData,
  ClientData,
  PdfConfig,
  PdfSections,
  getDefaultSections,
} from './pdfUtils';

export interface QuoteService {
  service_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  iva_percent?: number;
  iva_amount?: number;
  discount_percent?: number;
  discount_amount?: number;
  total: number;
  service?: {
    name: string;
    description?: string;
  };
}

export interface QuoteData {
  quote_number: number;
  created_at: string;
  valid_until?: string | null;
  subtotal?: number | null;
  iva_total?: number | null;
  total?: number | null;
  notes?: string | null;
  name?: string | null;
  status?: string | null;
  client?: ClientData | null;
  contact?: { name: string; email?: string | null } | null;
  services?: QuoteService[];
}

export type QuoteTemplate = {
  name?: string;
  content?: string;
} | null;

function formatQuoteNumber(quoteNumber: number): string {
  return `P-${String(quoteNumber).padStart(4, '0')}`;
}

/**
 * Generate Quote PDF using Visual config (sections + section_order)
 * This is the ONLY layout - no more legacy/Quote2 detection
 */
export async function generateQuotePdf(
  quote: QuoteData,
  company: CompanyData,
  config?: PdfConfig,
  _template?: QuoteTemplate // Kept for API compatibility but ignored
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);

  const pdfColors = createColorsFromConfig(config);
  const fontSize = config?.font_size_base || 10;
  
  // Get section configuration (use defaults if not provided)
  const defaultSections = getDefaultSections();
  const sections: PdfSections = config?.sections 
    ? { 
        header: { ...defaultSections.header, ...config.sections.header },
        title: { ...defaultSections.title, ...config.sections.title },
        dates: { ...defaultSections.dates, ...config.sections.dates },
        client: { ...defaultSections.client, ...config.sections.client },
        table: { ...defaultSections.table, ...config.sections.table },
        totals: { ...defaultSections.totals, ...config.sections.totals },
        footer: { ...defaultSections.footer, ...config.sections.footer },
      }
    : defaultSections;

  console.log('[PDF Quote] Using Visual config - sections:', Object.keys(sections).filter(k => (sections as any)[k]?.visible));

  const clientData: ClientData | null = quote.client || null;

  const docMargin = config?.margins || MARGIN;
  const left = docMargin;
  const right = A4_WIDTH - docMargin;
  const contentWidth = right - left;

  let y = A4_HEIGHT - docMargin;

  // ============ HEADER SECTION ============
  if (sections.header.visible) {
    y -= sections.header.margin_top;
    
    const showLogo = config?.show_logo !== false;
    const logoPosition = config?.logo_position || 'left';
    const logoSize = sections.header.logo_size || 60;

    if (showLogo && company.logo_url) {
      const logo = await embedLogo(pdfDoc, company.logo_url);
      if (logo) {
        const scale = logoSize / Math.max(logo.width, logo.height);
        const scaledHeight = logo.height * scale;
        drawLogo(page, logo, logoPosition, y);
        y -= scaledHeight + sections.header.spacing;
      }
    }

    // Company name
    page.drawText(company.name || 'Mi Empresa', {
      x: left,
      y,
      size: 16,
      font: fonts.bold,
      color: pdfColors.text,
    });

    // Company details on the right
    const rightX = right - 220;
    let rightY = y + 10;
    const rightLines: string[] = [];
    if (company.address) rightLines.push(company.address);
    if (company.cif) rightLines.push(`CIF: ${company.cif}`);
    if (company.email) rightLines.push(company.email);

    rightLines.forEach((line) => {
      page.drawText(line.substring(0, 55), {
        x: rightX,
        y: rightY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      rightY -= sections.header.spacing;
    });

    y -= 20;
  }

  // ============ TITLE SECTION ============
  if (sections.title.visible) {
    y -= sections.title.margin_top;
    
    const titleText = sections.title.text || config?.title_text || 'PRESUPUESTO';
    const titleSize = sections.title.size || 28;
    const titleWidth = fonts.bold.widthOfTextAtSize(titleText, titleSize);
    const titleColor = config?.title_color ? hexToRgb(config.title_color) : null;
    
    page.drawText(titleText, {
      x: (A4_WIDTH - titleWidth) / 2,
      y,
      size: titleSize,
      font: fonts.bold,
      color: titleColor ? rgb(titleColor.r, titleColor.g, titleColor.b) : pdfColors.primary,
    });

    // Quote number below title
    const numberText = `Nº ${formatQuoteNumber(quote.quote_number)}`;
    const numberSize = 16;
    const numberWidth = fonts.regular.widthOfTextAtSize(numberText, numberSize);
    
    y -= sections.title.spacing;
    
    page.drawText(numberText, {
      x: (A4_WIDTH - numberWidth) / 2,
      y,
      size: numberSize,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    
    y -= 10;
  }

  // ============ DATES SECTION ============
  if (sections.dates.visible) {
    y -= sections.dates.margin_top;

    page.drawText('Fecha:', {
      x: left,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    page.drawText(formatDate(quote.created_at), {
      x: left + 60,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });

    if (quote.valid_until) {
      page.drawText('Válido hasta:', {
        x: left + 180,
        y,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      page.drawText(formatDate(quote.valid_until), {
        x: left + 260,
        y,
        size: fontSize - 1,
        font: fonts.bold,
        color: pdfColors.text,
      });
    }

    y -= sections.dates.spacing;
  }

  // ============ CLIENT SECTION ============
  if (sections.client.visible) {
    y -= sections.client.margin_top;
    
    const boxPadding = sections.client.padding;
    const clientLineSpacing = sections.client.spacing;
    const clientBoxColor = sections.client.background_color || '#f8f9fa';
    
    if (clientData) {
      // Calculate box height based on content
      const clientLineCount = 2 + (clientData.address ? 1 : 0) + (clientData.cif ? 1 : 0);
      const boxHeight = Math.max(78, boxPadding * 2 + 18 + clientLineCount * clientLineSpacing);
      const clientBoxRgb = hexToRgb(clientBoxColor);

      // Draw client box background
      page.drawRectangle({
        x: left,
        y: y - boxHeight,
        width: contentWidth,
        height: boxHeight,
        color: rgb(clientBoxRgb.r, clientBoxRgb.g, clientBoxRgb.b),
      });

      // Draw border if configured
      if (sections.client.show_border) {
        const borderColor = sections.client.border_color || '#e5e7eb';
        const borderRgb = hexToRgb(borderColor);
        page.drawRectangle({
          x: left,
          y: y - boxHeight,
          width: contentWidth,
          height: boxHeight,
          borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
          borderWidth: 1,
        });
      }

      let boxY = y - boxPadding - 10;
      page.drawText('CLIENTE', {
        x: left + boxPadding,
        y: boxY,
        size: fontSize - 2,
        font: fonts.bold,
        color: pdfColors.secondary,
      });
      boxY -= clientLineSpacing;

      page.drawText(clientData.name || '', {
        x: left + boxPadding,
        y: boxY,
        size: fontSize + 1,
        font: fonts.bold,
        color: pdfColors.text,
      });
      boxY -= clientLineSpacing;

      if (clientData.address) {
        page.drawText(clientData.address.substring(0, 70), {
          x: left + boxPadding,
          y: boxY,
          size: fontSize - 1,
          font: fonts.regular,
          color: pdfColors.text,
        });
        boxY -= clientLineSpacing;
      }

      if (clientData.cif) {
        page.drawText(`CIF: ${clientData.cif}`, {
          x: left + boxPadding,
          y: boxY,
          size: fontSize - 1,
          font: fonts.regular,
          color: pdfColors.text,
        });
      }

      y = y - boxHeight;
    } else if (quote.contact) {
      // Contact section for quotes without client
      const contactBoxHeight = 60;
      const contactBoxRgb = hexToRgb(clientBoxColor);

      page.drawRectangle({
        x: left,
        y: y - contactBoxHeight,
        width: contentWidth,
        height: contactBoxHeight,
        color: rgb(contactBoxRgb.r, contactBoxRgb.g, contactBoxRgb.b),
      });

      // Draw border if configured
      if (sections.client.show_border) {
        const borderColor = sections.client.border_color || '#e5e7eb';
        const borderRgb = hexToRgb(borderColor);
        page.drawRectangle({
          x: left,
          y: y - contactBoxHeight,
          width: contentWidth,
          height: contactBoxHeight,
          borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
          borderWidth: 1,
        });
      }

      let boxY = y - boxPadding - 10;
      page.drawText('CONTACTO', {
        x: left + boxPadding,
        y: boxY,
        size: fontSize - 2,
        font: fonts.bold,
        color: pdfColors.secondary,
      });
      boxY -= clientLineSpacing;

      page.drawText(quote.contact.name || '', {
        x: left + boxPadding,
        y: boxY,
        size: fontSize + 1,
        font: fonts.bold,
        color: pdfColors.text,
      });
      boxY -= clientLineSpacing;

      if (quote.contact.email) {
        page.drawText(quote.contact.email, {
          x: left + boxPadding,
          y: boxY,
          size: fontSize - 1,
          font: fonts.regular,
          color: pdfColors.text,
        });
      }

      y = y - contactBoxHeight;
    }
  }

  // Quote name if exists
  if (quote.name) {
    y -= 15;
    page.drawText(quote.name, {
      x: left,
      y,
      size: fontSize + 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
    y -= 10;
  }

  // ============ TABLE SECTION ============
  if (sections.table.visible) {
    y -= sections.table.margin_top;
    
    const headerHeight = sections.table.header_height;
    const rowHeight = sections.table.row_height;
    const showTableBorders = sections.table.show_borders;
    const tableBorderColor = sections.table.border_color || '#e5e7eb';
    const tableBorderRgb = hexToRgb(tableBorderColor);
    const tableHeaderColor = config?.table_header_color || config?.primary_color || '#3b82f6';
    const tableHeaderRgb = hexToRgb(tableHeaderColor);

    // Table header background
    page.drawRectangle({
      x: left,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: rgb(tableHeaderRgb.r, tableHeaderRgb.g, tableHeaderRgb.b),
    });

    // Column layout
    const colDescX = left + 12;
    const colQtyX = left + contentWidth * 0.70;
    const colUnitX = left + contentWidth * 0.84;
    const colTotX = right - 12;

    const cols = [
      { label: 'Descripción', x: colDescX, align: 'left' as const },
      { label: 'Cant.', x: colQtyX, align: 'right' as const },
      { label: 'Precio', x: colUnitX, align: 'right' as const },
      { label: 'Total', x: colTotX, align: 'right' as const },
    ];

    cols.forEach((c) => {
      const textWidth = fonts.bold.widthOfTextAtSize(c.label, fontSize - 1);
      const x = c.align === 'right' ? c.x - textWidth : c.x;
      page.drawText(c.label, {
        x,
        y: y - headerHeight + (headerHeight - (fontSize - 1)) / 2 - 1,
        size: fontSize - 1,
        font: fonts.bold,
        color: pdfColors.white,
      });
    });

    y -= headerHeight;

    // Service rows
    const services = quote.services || [];

    services.forEach((svc, idx) => {
      const rowBottomY = y - rowHeight;

      // Alternate row background
      if (idx % 2 === 1) {
        page.drawRectangle({
          x: left,
          y: rowBottomY,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      const desc = (svc.service?.name || 'Servicio').substring(0, 60);
      const qty = String(svc.quantity || 1);
      const unit = formatCurrency(svc.unit_price);
      const tot = formatCurrency(svc.total);

      const textY = rowBottomY + (rowHeight - (fontSize - 1)) / 2 - 1;

      page.drawText(desc, {
        x: colDescX,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const qtyW = fonts.regular.widthOfTextAtSize(qty, fontSize - 1);
      page.drawText(qty, {
        x: colQtyX - qtyW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const unitW = fonts.regular.widthOfTextAtSize(unit, fontSize - 1);
      page.drawText(unit, {
        x: colUnitX - unitW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const totW = fonts.regular.widthOfTextAtSize(tot, fontSize - 1);
      page.drawText(tot, {
        x: colTotX - totW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      // Divider line at bottom of row
      if (showTableBorders) {
        drawLine(
          page,
          left,
          rowBottomY,
          right,
          rowBottomY,
          rgb(tableBorderRgb.r, tableBorderRgb.g, tableBorderRgb.b),
          0.6,
        );
      }

      y = rowBottomY;
    });
  }

  // ============ TOTALS SECTION ============
  if (sections.totals.visible) {
    y -= sections.totals.margin_top;
    
    const totalsLineSpacing = sections.totals.line_spacing;
    const showTotalsLines = sections.totals.show_lines;
    const totalsLineColor = sections.totals.line_color || '#e5e7eb';
    const totalsLineRgb = hexToRgb(totalsLineColor);

    const totalsWidth = 250;
    const totalsX = right - totalsWidth;

    const rows = [
      { label: 'Subtotal:', value: formatCurrency(quote.subtotal || 0), bold: false },
      { label: 'IVA (21%):', value: formatCurrency(quote.iva_total || 0), bold: false },
      { label: 'TOTAL:', value: formatCurrency(quote.total || 0), bold: true },
    ];

    let currentY = y;
    rows.forEach((r, i) => {
      const isTotal = r.bold;
      const size = isTotal ? 18 : fontSize;
      const font = isTotal ? fonts.bold : fonts.regular;
      const color = isTotal ? pdfColors.primary : pdfColors.secondary;

      // Draw label
      page.drawText(r.label, {
        x: totalsX,
        y: currentY,
        size,
        font,
        color,
      });

      // Draw value (right-aligned)
      const vW = font.widthOfTextAtSize(r.value, size);
      page.drawText(r.value, {
        x: right - vW,
        y: currentY,
        size,
        font,
        color,
      });

      // Draw separator line just UNDER the current row text
      if (showTotalsLines && i < rows.length - 1) {
        const lineY = currentY - 3;
        drawLine(
          page,
          totalsX,
          lineY,
          right,
          lineY,
          rgb(totalsLineRgb.r, totalsLineRgb.g, totalsLineRgb.b),
          0.5,
        );
      }

      // Move to next row using configured line spacing
      currentY -= totalsLineSpacing;
    });

    y = currentY;
  }

  // ============ NOTES SECTION ============
  const showNotes = config?.show_notes !== false;
  if (showNotes && quote.notes) {
    y -= 20;
    page.drawText('Observaciones:', {
      x: left,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.muted,
    });
    y -= 14;

    const noteLines = quote.notes.split('\n').slice(0, 3);
    noteLines.forEach((line) => {
      page.drawText(line.substring(0, 80), {
        x: left,
        y,
        size: fontSize - 2,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      y -= 12;
    });
  }

  // ============ FOOTER SECTION ============
  if (sections.footer.visible) {
    const footerY = sections.footer.margin_top + 40;
    const showIban = sections.footer.show_iban ?? config?.show_iban_footer !== false;
    const footerLegalLines = config?.footer_legal_lines || [];
    const showFooterLegal = config?.show_footer_legal !== false;
    
    let footerTopY = footerY;

    // Legal footer lines
    if (showFooterLegal && footerLegalLines.length > 0) {
      const legalFontSize = 8;
      const legalColor = rgb(100 / 255, 116 / 255, 139 / 255);
      
      let legalY = footerTopY + (footerLegalLines.length * 12);
      
      page.drawRectangle({
        x: MARGIN,
        y: footerTopY - 10,
        width: A4_WIDTH - MARGIN * 2,
        height: footerLegalLines.length * 14 + 20,
        color: rgb(248 / 255, 250 / 255, 252 / 255),
      });
      
      drawLine(page, MARGIN, legalY + 10, A4_WIDTH - MARGIN, legalY + 10, pdfColors.border, 0.5);
      
      footerLegalLines.forEach((legalLine) => {
        const trimmedLine = legalLine.substring(0, 120);
        const lw = fonts.regular.widthOfTextAtSize(trimmedLine, legalFontSize);
        page.drawText(trimmedLine, {
          x: (A4_WIDTH - lw) / 2,
          y: legalY - 5,
          size: legalFontSize,
          font: fonts.regular,
          color: legalColor,
        });
        legalY -= 12;
      });
      
      footerTopY = legalY - 20;
    }

    // Company info footer
    drawLine(page, MARGIN, footerTopY, A4_WIDTH - MARGIN, footerTopY, pdfColors.border, 0.5);

    const footerColor = rgb(156 / 255, 163 / 255, 175 / 255);
    const footerSize = 9;
    const footerSpacing = sections.footer.spacing;

    const line1Parts = [company.name, company.address].filter(Boolean);
    const line1Raw = line1Parts.join(' · ');
    const line1 = line1Raw.substring(0, 90);
    if (line1) {
      const w1 = fonts.regular.widthOfTextAtSize(line1, footerSize);
      page.drawText(line1, {
        x: (A4_WIDTH - w1) / 2,
        y: footerTopY - footerSpacing,
        size: footerSize,
        font: fonts.regular,
        color: footerColor,
      });
    }

    if (showIban && company.iban) {
      const line2 = `IBAN: ${company.iban}`.substring(0, 90);
      const w2 = fonts.regular.widthOfTextAtSize(line2, footerSize);
      page.drawText(line2, {
        x: (A4_WIDTH - w2) / 2,
        y: footerTopY - footerSpacing * 2,
        size: footerSize,
        font: fonts.regular,
        color: footerColor,
      });
    }
  }

  return pdfToBlob(pdfDoc);
}

export async function generateQuotePdfBase64(
  quote: QuoteData,
  company: CompanyData,
  config?: PdfConfig,
  template?: QuoteTemplate
): Promise<string> {
  const blob = await generateQuotePdf(quote, company, config, template);
  return blobToBase64(blob);
}

export async function downloadQuotePdf(
  quote: QuoteData,
  company: CompanyData,
  config?: PdfConfig,
  template?: QuoteTemplate
): Promise<void> {
  const blob = await generateQuotePdf(quote, company, config, template);
  downloadBlob(blob, `presupuesto-${quote.quote_number}.pdf`);
}
