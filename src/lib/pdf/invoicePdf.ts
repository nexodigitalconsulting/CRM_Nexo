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

export async function generateInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig
): Promise<Blob> {
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
  const columns = showDiscounts ? [
    { label: 'Descripción', x: MARGIN + 5, width: 250 },
    { label: 'Cant.', x: MARGIN + 260, width: 40 },
    { label: 'Precio', x: MARGIN + 310, width: 70 },
    { label: 'Dto.', x: MARGIN + 380, width: 50 },
    { label: 'Total', x: MARGIN + 440, width: 70 },
  ] : [
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
    
    const values = showDiscounts ? [
      { text: serviceName.substring(0, 40), x: columns[0].x },
      { text: String(svc.quantity || 1), x: columns[1].x },
      { text: formatCurrency(svc.unit_price), x: columns[2].x },
      { text: svc.discount_percent ? `${svc.discount_percent}%` : '-', x: columns[3].x },
      { text: formatCurrency(svc.total), x: columns[4].x },
    ] : [
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
  config?: PdfConfig
): Promise<string> {
  const blob = await generateInvoicePdf(invoice, company, config);
  return blobToBase64(blob);
}

export async function downloadInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData,
  config?: PdfConfig
): Promise<void> {
  const blob = await generateInvoicePdf(invoice, company, config);
  downloadBlob(blob, `factura-${invoice.invoice_number}.pdf`);
}
