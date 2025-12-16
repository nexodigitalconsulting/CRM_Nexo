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

export async function generateQuotePdf(
  quote: QuoteData,
  company: CompanyData
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);
  
  let y = A4_HEIGHT - MARGIN;
  
  // Company header
  y = drawCompanyHeader(page, company, fonts, y);
  
  // Document title (right side)
  drawDocumentTitle(page, 'PRESUPUESTO', quote.quote_number, fonts, A4_HEIGHT - MARGIN - 20);
  
  // Separator line
  y -= 10;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, colors.border, 1);
  y -= 25;
  
  // Quote details (right side)
  const detailsX = A4_WIDTH - MARGIN - 150;
  let detailY = y + 10;
  
  page.drawText('Fecha:', {
    x: detailsX,
    y: detailY,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  page.drawText(formatDate(quote.created_at), {
    x: detailsX + 80,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: colors.text,
  });
  detailY -= 14;
  
  if (quote.valid_until) {
    page.drawText('Válido hasta:', {
      x: detailsX,
      y: detailY,
      size: 9,
      font: fonts.regular,
      color: colors.muted,
    });
    page.drawText(formatDate(quote.valid_until), {
      x: detailsX + 80,
      y: detailY,
      size: 9,
      font: fonts.bold,
      color: colors.text,
    });
  }
  
  // Client/Contact section
  if (quote.client) {
    y = drawClientSection(page, quote.client, fonts, y);
  } else if (quote.contact) {
    page.drawText('CONTACTO', {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.bold,
      color: colors.muted,
    });
    y -= 16;
    
    page.drawText(quote.contact.name || '', {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.bold,
      color: colors.text,
    });
    y -= 14;
    
    if (quote.contact.email) {
      page.drawText(quote.contact.email, {
        x: MARGIN,
        y,
        size: 9,
        font: fonts.regular,
        color: colors.secondary,
      });
      y -= 12;
    }
    y -= 10;
  }
  
  // Quote name if exists
  if (quote.name) {
    y -= 10;
    page.drawText(quote.name, {
      x: MARGIN,
      y,
      size: 11,
      font: fonts.bold,
      color: colors.text,
    });
    y -= 20;
  }
  
  y -= 10;
  
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
  const services = quote.services || [];
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
    quote.subtotal || 0,
    quote.iva_total || 0,
    quote.total || 0,
    fonts,
    y,
    21
  );
  
  // Notes
  if (quote.notes) {
    y -= 20;
    page.drawText('Observaciones:', {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.bold,
      color: colors.muted,
    });
    y -= 14;
    
    const noteLines = quote.notes.split('\n').slice(0, 3);
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

export async function generateQuotePdfBase64(
  quote: QuoteData,
  company: CompanyData
): Promise<string> {
  const blob = await generateQuotePdf(quote, company);
  return blobToBase64(blob);
}

export async function downloadQuotePdf(
  quote: QuoteData,
  company: CompanyData
): Promise<void> {
  const blob = await generateQuotePdf(quote, company);
  downloadBlob(blob, `presupuesto-${quote.quote_number}.pdf`);
}
