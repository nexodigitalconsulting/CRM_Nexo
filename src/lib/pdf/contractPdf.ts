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

export interface ContractService {
  service_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  iva_percent?: number;
  iva_amount?: number;
  discount_percent?: number;
  discount_amount?: number;
  total: number;
  is_active?: boolean;
  service?: {
    name: string;
    description?: string;
  };
}

export interface ContractData {
  contract_number: number;
  name?: string | null;
  start_date: string;
  end_date?: string | null;
  billing_period?: string | null;
  subtotal?: number | null;
  iva_total?: number | null;
  total?: number | null;
  notes?: string | null;
  status?: string | null;
  client?: ClientData;
  services?: ContractService[];
}

function getBillingPeriodLabel(period: string | null | undefined): string {
  const labels: Record<string, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual',
    one_time: 'Pago único',
    other: 'Otro',
  };
  return labels[period || ''] || period || '-';
}

function getStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    active: 'Activo',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    pending_activation: 'Pendiente',
  };
  return labels[status || ''] || status || '-';
}

export async function generateContractPdf(
  contract: ContractData,
  company: CompanyData
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  const page = addPage(pdfDoc);
  
  const clientData: ClientData = contract.client || { name: 'Cliente' };
  let y = A4_HEIGHT - MARGIN;
  
  // Company header
  y = drawCompanyHeader(page, company, fonts, y);
  
  // Document title (right side)
  drawDocumentTitle(page, 'CONTRATO', contract.contract_number, fonts, A4_HEIGHT - MARGIN - 20);
  
  // Separator line
  y -= 10;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, colors.border, 1);
  y -= 25;
  
  // Contract details (right side)
  const detailsX = A4_WIDTH - MARGIN - 150;
  let detailY = y + 10;
  
  page.drawText('Fecha inicio:', {
    x: detailsX,
    y: detailY,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  page.drawText(formatDate(contract.start_date), {
    x: detailsX + 80,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: colors.text,
  });
  detailY -= 14;
  
  if (contract.end_date) {
    page.drawText('Fecha fin:', {
      x: detailsX,
      y: detailY,
      size: 9,
      font: fonts.regular,
      color: colors.muted,
    });
    page.drawText(formatDate(contract.end_date), {
      x: detailsX + 80,
      y: detailY,
      size: 9,
      font: fonts.bold,
      color: colors.text,
    });
    detailY -= 14;
  }
  
  page.drawText('Facturación:', {
    x: detailsX,
    y: detailY,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  page.drawText(getBillingPeriodLabel(contract.billing_period), {
    x: detailsX + 80,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: colors.text,
  });
  detailY -= 14;
  
  page.drawText('Estado:', {
    x: detailsX,
    y: detailY,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  page.drawText(getStatusLabel(contract.status), {
    x: detailsX + 80,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: colors.text,
  });
  
  // Client section
  y = drawClientSection(page, clientData, fonts, y);
  
  // Contract name if exists
  if (contract.name) {
    y -= 10;
    page.drawText(contract.name, {
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
    { label: 'Servicio', x: MARGIN + 5, width: 250 },
    { label: 'Cant.', x: MARGIN + 260, width: 40 },
    { label: 'Precio', x: MARGIN + 310, width: 70 },
    { label: 'Dto.', x: MARGIN + 380, width: 50 },
    { label: 'Total', x: MARGIN + 440, width: 70 },
  ];
  
  y = drawTableHeader(page, y, columns, fonts);
  
  // Service rows (only active services)
  const services = (contract.services || []).filter(s => s.is_active !== false);
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
    contract.subtotal || 0,
    contract.iva_total || 0,
    contract.total || 0,
    fonts,
    y,
    21
  );
  
  // Billing period note
  y -= 10;
  const periodNote = `Importe por período de facturación: ${getBillingPeriodLabel(contract.billing_period)}`;
  page.drawText(periodNote, {
    x: MARGIN,
    y,
    size: 9,
    font: fonts.regular,
    color: colors.muted,
  });
  
  // Notes
  if (contract.notes) {
    y -= 25;
    page.drawText('Observaciones:', {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.bold,
      color: colors.muted,
    });
    y -= 14;
    
    const noteLines = contract.notes.split('\n').slice(0, 3);
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

export async function generateContractPdfBase64(
  contract: ContractData,
  company: CompanyData
): Promise<string> {
  const blob = await generateContractPdf(contract, company);
  return blobToBase64(blob);
}

export async function downloadContractPdf(
  contract: ContractData,
  company: CompanyData
): Promise<void> {
  const blob = await generateContractPdf(contract, company);
  downloadBlob(blob, `contrato-${contract.contract_number}.pdf`);
}
