import { rgb } from 'pdf-lib';
import {
  createPdfDocument,
  embedFonts,
  addPage,
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
  createColorsFromConfig,
  formatCurrency,
  formatDate,
  drawLine,
  drawTableHeader,
  drawTableRow,
  pdfToBlob,
  blobToBase64,
  downloadBlob,
  drawCompanyHeaderWithLogo,
  drawClientSection,
  drawDocumentTitle,
  drawTotals,
  drawFooter,
  embedLogo,
  drawLogo,
  CompanyData,
  ClientData,
  PdfConfig,
} from './pdfUtils';

export interface InvoiceService {
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

export interface InvoiceData {
  invoice_number: number;
  issue_date: string;
  due_date?: string | null;
  subtotal?: number | null;
  iva_amount?: number | null;
  iva_percent?: number | null;
  total?: number | null;
  notes?: string | null;
  status?: string | null;
  client?: ClientData;
  services?: InvoiceService[];
}

export type InvoiceTemplate = {
  name?: string;
  content?: string;
} | null;

function isFact2Template(template?: InvoiceTemplate): boolean {
  const name = template?.name?.toLowerCase() ?? '';
  const content = template?.content?.toLowerCase() ?? '';

  return (
    name.includes('fact2') ||
    content.includes('<!-- pdf_config:') ||
    (content.includes('services_rows') && content.includes('factura') && content.includes('cliente'))
  );
}

async function generateInvoicePdfFact2(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig,
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);

  const pdfColors = createColorsFromConfig(config);
  const fontSize = config?.font_size_base || 10;
  const showIban = config?.show_iban_footer !== false;

  const clientData: ClientData = invoice.client || { name: 'Cliente' };

  let y = A4_HEIGHT - MARGIN;

  // Header (logo + company name) LEFT, details RIGHT
  const showLogo = config?.show_logo !== false;
  const logoPosition = config?.logo_position || 'left';

  let headerLeftX = MARGIN;
  let headerTopY = y;

  if (showLogo && company.logo_url) {
    const logo = await (await import('./pdfUtils')).embedLogo(pdfDoc, company.logo_url);
    if (logo) {
      // For Fact2, we draw logo on the left only (matches template)
      // If user selected center/right, respect it.
      const pos = logoPosition;
      (await import('./pdfUtils')).drawLogo(page, logo, pos, headerTopY);

      if (pos === 'left') {
        headerTopY -= logo.height + 10;
      } else {
        headerTopY -= logo.height + 10;
      }
    }
  }

  // Company name (black-ish like template)
  page.drawText(company.name || 'Mi Empresa', {
    x: headerLeftX,
    y: headerTopY,
    size: 16,
    font: fonts.bold,
    color: pdfColors.text,
  });

  // Company details RIGHT
  const rightX = A4_WIDTH - MARGIN - 220;
  let rightY = y - 10;
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
    rightY -= 14;
  });

  // Title centered
  y = headerTopY - 35;
  const title = 'FACTURA';
  const titleSize = 22;
  const titleWidth = fonts.bold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: (A4_WIDTH - titleWidth) / 2,
    y,
    size: titleSize,
    font: fonts.bold,
    color: pdfColors.primary,
  });

  const numberText = `Nº ${invoice.invoice_number}`;
  const numberSize = 12;
  const numberWidth = fonts.regular.widthOfTextAtSize(numberText, numberSize);
  page.drawText(numberText, {
    x: (A4_WIDTH - numberWidth) / 2,
    y: y - 18,
    size: numberSize,
    font: fonts.regular,
    color: pdfColors.secondary,
  });

  y -= 50;

  // Dates row
  page.drawText('Fecha emisión:', {
    x: MARGIN,
    y,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  page.drawText(formatDate(invoice.issue_date), {
    x: MARGIN + 80,
    y,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });

  page.drawText('Vencimiento:', {
    x: MARGIN + 220,
    y,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.secondary,
  });
  page.drawText(invoice.due_date ? formatDate(invoice.due_date) : '-', {
    x: MARGIN + 300,
    y,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });

  y -= 28;

  // Client box
  const boxPadding = 14;
  const boxHeight = 78;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: A4_WIDTH - MARGIN * 2,
    height: boxHeight,
    color: rgb(0.97, 0.98, 0.99),
  });

  let boxY = y - boxPadding - 10;
  page.drawText('CLIENTE', {
    x: MARGIN + boxPadding,
    y: boxY,
    size: fontSize - 2,
    font: fonts.bold,
    color: pdfColors.secondary,
  });
  boxY -= 16;

  page.drawText(clientData.name || '', {
    x: MARGIN + boxPadding,
    y: boxY,
    size: fontSize + 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  boxY -= 14;

  if (clientData.address) {
    page.drawText(clientData.address.substring(0, 70), {
      x: MARGIN + boxPadding,
      y: boxY,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });
    boxY -= 12;
  }

  if (clientData.cif) {
    page.drawText(`CIF: ${clientData.cif}`, {
      x: MARGIN + boxPadding,
      y: boxY,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });
  }

  y = y - boxHeight - 25;

  // Services table (header with primary background, white text)
  const headerHeight = 26;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 6,
    width: A4_WIDTH - MARGIN * 2,
    height: headerHeight,
    color: pdfColors.primary,
  });

  const cols = [
    { label: 'Descripción', x: MARGIN + 12, align: 'left' as const },
    { label: 'Cant.', x: MARGIN + 330, align: 'right' as const },
    { label: 'Precio', x: MARGIN + 410, align: 'right' as const },
    { label: 'Total', x: A4_WIDTH - MARGIN - 12, align: 'right' as const },
  ];

  cols.forEach((c) => {
    const textWidth = fonts.bold.widthOfTextAtSize(c.label, fontSize - 1);
    const x = c.align === 'right' ? c.x - textWidth : c.x;
    page.drawText(c.label, {
      x,
      y: y - 14,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.white,
    });
  });

  y = y - headerHeight - 6;

  const services = invoice.services || [];
  const rowHeight = 22;

  services.forEach((svc, idx) => {
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight + 6,
        width: A4_WIDTH - MARGIN * 2,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    const desc = (svc.service?.name || 'Servicio').substring(0, 50);
    const qty = String(svc.quantity || 1);
    const unit = formatCurrency(svc.unit_price);
    const tot = formatCurrency(svc.total);

    page.drawText(desc, {
      x: MARGIN + 12,
      y: y - 14,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });

    const qtyW = fonts.regular.widthOfTextAtSize(qty, fontSize - 1);
    page.drawText(qty, {
      x: MARGIN + 330 - qtyW,
      y: y - 14,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });

    const unitW = fonts.regular.widthOfTextAtSize(unit, fontSize - 1);
    page.drawText(unit, {
      x: MARGIN + 410 - unitW,
      y: y - 14,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });

    const totW = fonts.regular.widthOfTextAtSize(tot, fontSize - 1);
    page.drawText(tot, {
      x: A4_WIDTH - MARGIN - 12 - totW,
      y: y - 14,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.text,
    });

    y -= rowHeight;
  });

  // Totals on the right
  y -= 12;
  const totalsX = A4_WIDTH - MARGIN - 250;
  const labelColor = pdfColors.secondary;

  const rows = [
    { label: 'Subtotal:', value: formatCurrency(invoice.subtotal || 0), bold: false },
    { label: `IVA (${invoice.iva_percent || 21}%):`, value: formatCurrency(invoice.iva_amount || 0), bold: false },
    { label: 'TOTAL:', value: formatCurrency(invoice.total || 0), bold: true },
  ];

  let tY = y;
  rows.forEach((r, i) => {
    const isTotal = r.bold;
    const size = isTotal ? fontSize + 6 : fontSize;
    const font = isTotal ? fonts.bold : fonts.regular;
    const color = isTotal ? pdfColors.primary : labelColor;

    page.drawText(r.label, {
      x: totalsX,
      y: tY,
      size,
      font,
      color,
    });

    const vW = font.widthOfTextAtSize(r.value, size);
    page.drawText(r.value, {
      x: A4_WIDTH - MARGIN - vW,
      y: tY,
      size,
      font,
      color,
    });

    tY -= isTotal ? 22 : 16;

    if (i < 2) {
      drawLine(page, totalsX, tY + 8, A4_WIDTH - MARGIN, tY + 8, pdfColors.border, 0.5);
    }
  });

  // Footer
  drawFooter(page, company, fonts, showIban, pdfColors);

  return pdfToBlob(pdfDoc);
}

export async function generateInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig,
  template?: InvoiceTemplate
): Promise<Blob> {
  // If template is Fact2 (or compatible), draw PDF according to that structure
  if (isFact2Template(template)) {
    return generateInvoicePdfFact2(invoice, company, config);
  }

  // Legacy layout
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);

  const pdfColors = createColorsFromConfig(config);
  const fontSize = config?.font_size_base || 10;
  const showDiscounts = config?.show_discounts_column !== false;
  const showNotes = config?.show_notes !== false;
  const showIban = config?.show_iban_footer !== false;

  const clientData: ClientData = invoice.client || { name: 'Cliente' };
  let y = A4_HEIGHT - MARGIN;

  // Company header with logo
  y = await drawCompanyHeaderWithLogo(pdfDoc, page, company, fonts, y, config);

  // Document title (right side)
  drawDocumentTitle(page, 'FACTURA', invoice.invoice_number, fonts, A4_HEIGHT - MARGIN - 20, pdfColors);

  // Separator line
  y -= 10;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, pdfColors.border, 1);
  y -= 25;

  // Invoice details (right side)
  const detailsX = A4_WIDTH - MARGIN - 150;
  let detailY = y + 10;

  page.drawText('Fecha emisión:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page.drawText(formatDate(invoice.issue_date), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  detailY -= 14;

  if (invoice.due_date) {
    page.drawText('Vencimiento:', {
      x: detailsX,
      y: detailY,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.muted,
    });
    page.drawText(formatDate(invoice.due_date), {
      x: detailsX + 80,
      y: detailY,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
  }

  // Client section
  y = drawClientSection(page, clientData, fonts, y, pdfColors, fontSize);
  y -= 20;

  // Services table
  const columns = showDiscounts
    ? [
        { label: 'Descripción', x: MARGIN + 5, width: 250 },
        { label: 'Cant.', x: MARGIN + 260, width: 40 },
        { label: 'Precio', x: MARGIN + 310, width: 70 },
        { label: 'Dto.', x: MARGIN + 380, width: 50 },
        { label: 'Total', x: MARGIN + 440, width: 70 },
      ]
    : [
        { label: 'Descripción', x: MARGIN + 5, width: 280 },
        { label: 'Cant.', x: MARGIN + 290, width: 50 },
        { label: 'Precio', x: MARGIN + 350, width: 80 },
        { label: 'Total', x: MARGIN + 440, width: 70 },
      ];

  y = drawTableHeader(page, y, columns, fonts, pdfColors, fontSize - 1);

  // Service rows
  const services = invoice.services || [];
  services.forEach((svc, index) => {
    const serviceName = svc.service?.name || 'Servicio';

    const values = showDiscounts
      ? [
          { text: serviceName.substring(0, 40), x: columns[0].x },
          { text: String(svc.quantity || 1), x: columns[1].x },
          { text: formatCurrency(svc.unit_price), x: columns[2].x },
          { text: svc.discount_percent ? `${svc.discount_percent}%` : '-', x: columns[3].x },
          { text: formatCurrency(svc.total), x: columns[4].x },
        ]
      : [
          { text: serviceName.substring(0, 50), x: columns[0].x },
          { text: String(svc.quantity || 1), x: columns[1].x },
          { text: formatCurrency(svc.unit_price), x: columns[2].x },
          { text: formatCurrency(svc.total), x: columns[3].x },
        ];

    y = drawTableRow(page, y, values, fonts, index % 2 === 1, fontSize - 1);
  });

  // Bottom line of table
  y -= 5;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, pdfColors.border, 0.5);
  y -= 30;

  // Totals
  y = drawTotals(
    page,
    invoice.subtotal || 0,
    invoice.iva_amount || 0,
    invoice.total || 0,
    fonts,
    y,
    invoice.iva_percent || 21,
    pdfColors,
    fontSize
  );

  // Notes
  if (showNotes && invoice.notes) {
    y -= 20;
    page.drawText('Observaciones:', {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.muted,
    });
    y -= 14;

    const noteLines = invoice.notes.split('\n').slice(0, 3);
    noteLines.forEach((line) => {
      page.drawText(line.substring(0, 80), {
        x: MARGIN,
        y,
        size: fontSize - 2,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      y -= 12;
    });
  }

  // Footer
  drawFooter(page, company, fonts, showIban, pdfColors);

  return pdfToBlob(pdfDoc);
}


export async function generateInvoicePdfBase64(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig,
  template?: InvoiceTemplate
): Promise<string> {
  const blob = await generateInvoicePdf(invoice, company, config, template);
  return blobToBase64(blob);
}

export async function downloadInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig,
  template?: InvoiceTemplate
): Promise<void> {
  const blob = await generateInvoicePdf(invoice, company, config, template);
  downloadBlob(blob, `factura-${invoice.invoice_number}.pdf`);
}

