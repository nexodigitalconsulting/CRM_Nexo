import {
  createPdfDocument,
  embedFonts,
  addPage,
  A4_WIDTH,
  A4_HEIGHT,
  MARGIN,
  colors,
  formatCurrency,
  formatDate,
  drawLine,
  drawTableHeader,
  drawTableRow,
  pdfToBlob,
  blobToBase64,
  downloadBlob,
  drawCompanyHeader,
  drawClientSection,
  drawDocumentTitle,
  drawTotals,
  drawFooter,
  CompanyData,
  ClientData,
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
  company: CompanyData
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);
  
  const clientData: ClientData = invoice.client || { name: 'Cliente' };
  let y = A4_HEIGHT - MARGIN;
  
  // Company header
  y = drawCompanyHeader(page, company, fonts, y);
  
  // Document title (right side)
  drawDocumentTitle(page, 'FACTURA', invoice.invoice_number, fonts, A4_HEIGHT - MARGIN - 20);
  
  // Separator line
  y -= 10;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, colors.border, 1);
  y -= 25;
  
  // Invoice details (right side)
  const detailsX = A4_WIDTH - MARGIN - 150;
  let detailY = y + 10;
  
  page.drawText('Fecha emisión:', {
    x: detailsX,
    y: detailY,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  page.drawText(formatDate(invoice.issue_date), {
    x: detailsX + 80,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: colors.text,
  });
  detailY -= 14;
  
  if (invoice.due_date) {
    page.drawText('Vencimiento:', {
      x: detailsX,
      y: detailY,
      size: 9,
      font: fonts.regular,
      color: colors.muted,
    });
    page.drawText(formatDate(invoice.due_date), {
      x: detailsX + 80,
      y: detailY,
      size: 9,
      font: fonts.bold,
      color: colors.text,
    });
  }
  
  // Client section
  y = drawClientSection(page, clientData, fonts, y);
  y -= 20;
  
  // Services table
  const columns = [
    { label: 'Descripción', x: MARGIN + 5, width: 250 },
    { label: 'Cant.', x: MARGIN + 260, width: 40 },
    { label: 'Precio', x: MARGIN + 310, width: 70 },
    { label: 'Dto.', x: MARGIN + 380, width: 50 },
    { label: 'Total', x: MARGIN + 440, width: 70 },
  ];
  
  y = drawTableHeader(page, y, columns, fonts);
  
  // Service rows
  const services = invoice.services || [];
  services.forEach((svc, index) => {
    const serviceName = svc.service?.name || 'Servicio';
    const discountText = svc.discount_percent 
      ? `${svc.discount_percent}%` 
      : '-';
    
    y = drawTableRow(
      page,
      y,
      [
        { text: serviceName.substring(0, 40), x: columns[0].x },
        { text: String(svc.quantity || 1), x: columns[1].x },
        { text: formatCurrency(svc.unit_price), x: columns[2].x },
        { text: discountText, x: columns[3].x },
        { text: formatCurrency(svc.total), x: columns[4].x },
      ],
      fonts,
      index % 2 === 1
    );
  });
  
  // Bottom line of table
  y -= 5;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, colors.border, 0.5);
  y -= 30;
  
  // Totals
  y = drawTotals(
    page,
    invoice.subtotal || 0,
    invoice.iva_amount || 0,
    invoice.total || 0,
    fonts,
    y,
    invoice.iva_percent || 21
  );
  
  // Notes
  if (invoice.notes) {
    y -= 20;
    page.drawText('Observaciones:', {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.bold,
      color: colors.muted,
    });
    y -= 14;
    
    const noteLines = invoice.notes.split('\n').slice(0, 3);
    noteLines.forEach((line) => {
      page.drawText(line.substring(0, 80), {
        x: MARGIN,
        y,
        size: 8,
        font: fonts.regular,
        color: colors.secondary,
      });
      y -= 12;
    });
  }
  
  // Footer
  drawFooter(page, company, fonts);
  
  return pdfToBlob(pdfDoc);
}

export async function generateInvoicePdfBase64(
  invoice: InvoiceData,
  company: CompanyData
): Promise<string> {
  const blob = await generateInvoicePdf(invoice, company);
  return blobToBase64(blob);
}

export async function downloadInvoicePdf(
  invoice: InvoiceData,
  company: CompanyData
): Promise<void> {
  const blob = await generateInvoicePdf(invoice, company);
  downloadBlob(blob, `factura-${invoice.invoice_number}.pdf`);
}
