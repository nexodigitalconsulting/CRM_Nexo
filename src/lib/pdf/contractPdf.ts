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
  drawLegalClauses,
  drawSignatureArea,
  replaceClauseVariables,
  CompanyData,
  ClientData,
  PdfConfig,
  PdfSections,
  getDefaultSections,
  LegalClause,
  DEFAULT_LEGAL_CLAUSES,
  PdfFonts,
  PdfColors,
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
  company: CompanyData,
  config?: PdfConfig
): Promise<Blob> {
  const pdfDoc = await createPdfDocument();
  const fonts = await embedFonts(pdfDoc);
  
  const pdfColors = createColorsFromConfig(config);
  const fontSize = config?.font_size_base || 10;
  
  // Get section configuration
  const defaultSections = getDefaultSections();
  const sections: PdfSections = config?.sections 
    ? { 
        ...defaultSections,
        ...config.sections,
        header: { ...defaultSections.header, ...config.sections.header },
        title: { ...defaultSections.title, ...config.sections.title },
        dates: { ...defaultSections.dates, ...config.sections.dates },
        client: { ...defaultSections.client, ...config.sections.client },
        table: { ...defaultSections.table, ...config.sections.table },
        totals: { ...defaultSections.totals, ...config.sections.totals },
        footer: { ...defaultSections.footer, ...config.sections.footer },
        legal: { ...defaultSections.legal!, ...config.sections.legal },
        signatures: { ...defaultSections.signatures!, ...config.sections.signatures },
      }
    : defaultSections;

  // Get legal clauses (use config or defaults)
  const rawClauses: LegalClause[] = config?.legal_clauses || DEFAULT_LEGAL_CLAUSES;
  const showSignatures = config?.show_signatures !== false;
  const showLegalClauses = sections.legal?.visible !== false;
  
  const showDiscounts = config?.show_discounts_column !== false;
  const showNotes = config?.show_notes !== false;
  const showIban = config?.show_iban_footer !== false;
  
  const clientData: ClientData = contract.client || { name: 'Cliente' };
  
  // Prepare variable data for clause replacement
  const clauseVariables: Record<string, string> = {
    company_name: company.name || '',
    company_cif: company.cif || '',
    company_address: company.address || '',
    company_city: company.city || '',
    company_email: company.email || '',
    company_phone: company.phone || '',
    company_iban: company.iban || '',
    client_name: clientData.name || '',
    client_cif: clientData.cif || '',
    client_address: clientData.address || '',
    client_city: clientData.city || '',
    client_email: clientData.email || '',
    contract_number: String(contract.contract_number),
    contract_name: contract.name || '',
    start_date: formatDate(contract.start_date),
    end_date: formatDate(contract.end_date),
    billing_period: getBillingPeriodLabel(contract.billing_period),
    subtotal: formatCurrency(contract.subtotal),
    iva_amount: formatCurrency(contract.iva_total),
    total: formatCurrency(contract.total),
    current_date: formatDate(new Date().toISOString()),
  };
  
  // Replace variables in clause content
  const legalClauses: LegalClause[] = rawClauses.map(clause => ({
    ...clause,
    content: replaceClauseVariables(clause.content, clauseVariables),
  }));
  
  // Track pages for numbering
  const pages: ReturnType<typeof addPage>[] = [];
  let page = addPage(pdfDoc);
  pages.push(page);
  let y = A4_HEIGHT - MARGIN;
  
  // Helper function to check if we need a new page
  const checkPageBreak = (neededSpace: number): void => {
    if (y - neededSpace < MARGIN + 60) {
      page = addPage(pdfDoc);
      pages.push(page);
      y = A4_HEIGHT - MARGIN;
    }
  };
  
  // ============ HEADER SECTION ============
  y = await drawCompanyHeaderWithLogo(pdfDoc, page, company, fonts, y, config);
  
  // Document title (right side)
  drawDocumentTitle(page, 'CONTRATO', contract.contract_number, fonts, A4_HEIGHT - MARGIN - 20, pdfColors);
  
  // Separator line
  y -= 10;
  drawLine(page, MARGIN, y, A4_WIDTH - MARGIN, y, pdfColors.border, 1);
  y -= 25;
  
  // ============ CONTRACT DETAILS ============
  const detailsX = A4_WIDTH - MARGIN - 150;
  let detailY = y + 10;
  
  page.drawText('Fecha inicio:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page.drawText(formatDate(contract.start_date), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  detailY -= 14;
  
  if (contract.end_date) {
    page.drawText('Fecha fin:', {
      x: detailsX,
      y: detailY,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.muted,
    });
    page.drawText(formatDate(contract.end_date), {
      x: detailsX + 80,
      y: detailY,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
    detailY -= 14;
  }
  
  page.drawText('Facturación:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page.drawText(getBillingPeriodLabel(contract.billing_period), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  detailY -= 14;
  
  page.drawText('Estado:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page.drawText(getStatusLabel(contract.status), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  
  // ============ CLIENT SECTION ============
  y = drawClientSection(page, clientData, fonts, y, pdfColors, fontSize);
  
  // Contract name if exists
  if (contract.name) {
    y -= 10;
    page.drawText(contract.name, {
      x: MARGIN,
      y,
      size: fontSize + 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
    y -= 20;
  }
  
  y -= 10;
  
  // ============ SERVICES TABLE ============
  const columns = showDiscounts ? [
    { label: 'Servicio', x: MARGIN + 5, width: 250 },
    { label: 'Cant.', x: MARGIN + 260, width: 40 },
    { label: 'Precio', x: MARGIN + 310, width: 70 },
    { label: 'Dto.', x: MARGIN + 380, width: 50 },
    { label: 'Total', x: MARGIN + 440, width: 70 },
  ] : [
    { label: 'Servicio', x: MARGIN + 5, width: 280 },
    { label: 'Cant.', x: MARGIN + 290, width: 50 },
    { label: 'Precio', x: MARGIN + 350, width: 80 },
    { label: 'Total', x: MARGIN + 440, width: 70 },
  ];
  
  y = drawTableHeader(page, y, columns, fonts, pdfColors, fontSize - 1);
  
  // Service rows (only active services)
  const services = (contract.services || []).filter(s => s.is_active !== false);
  services.forEach((svc, index) => {
    checkPageBreak(25);
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
  
  // ============ TOTALS ============
  y = drawTotals(
    page,
    contract.subtotal || 0,
    contract.iva_total || 0,
    contract.total || 0,
    fonts,
    y,
    21,
    pdfColors,
    fontSize
  );
  
  // Billing period note
  y -= 10;
  const periodNote = `Importe por período de facturación: ${getBillingPeriodLabel(contract.billing_period)}`;
  page.drawText(periodNote, {
    x: MARGIN,
    y,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  
  // ============ NOTES ============
  if (showNotes && contract.notes) {
    y -= 25;
    page.drawText('Observaciones:', {
      x: MARGIN,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.muted,
    });
    y -= 14;
    
    const noteLines = contract.notes.split('\n').slice(0, 3);
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
  
  // ============ LEGAL CLAUSES ============
  if (showLegalClauses) {
    const visibleClauses = legalClauses.filter(c => c.visible);
    if (visibleClauses.length > 0) {
      // Check if we need a new page for clauses
      checkPageBreak(150);
      y -= (sections.legal?.margin_top || 30);
      
      y = drawLegalClauses(page, legalClauses, fonts, y, pdfColors, {
        clauseSpacing: sections.legal?.clause_spacing || 20,
        titleSize: sections.legal?.title_size || 10,
        contentSize: fontSize - 1,
      });
    }
  }
  
  // ============ SIGNATURES ============
  if (showSignatures && sections.signatures?.visible !== false) {
    checkPageBreak(80);
    y -= (sections.signatures?.margin_top || 50);
    
    y = drawSignatureArea(page, fonts, y, pdfColors, {
      lineWidth: sections.signatures?.line_width || 180,
      labelSize: sections.signatures?.label_size || 9,
      companyName: company.name || 'El Prestador',
      clientName: clientData.name || 'El Cliente',
    });
  }
  
  // ============ FOOTER WITH PAGE NUMBERS ============
  const totalPages = pages.length;
  pages.forEach((p, index) => {
    drawFooter(p, company, fonts, showIban, pdfColors, { current: index + 1, total: totalPages });
  });
  
  return pdfToBlob(pdfDoc);
}

export async function generateContractPdfBase64(
  contract: ContractData,
  company: CompanyData,
  config?: PdfConfig
): Promise<string> {
  const blob = await generateContractPdf(contract, company, config);
  return blobToBase64(blob);
}

export async function downloadContractPdf(
  contract: ContractData,
  company: CompanyData,
  config?: PdfConfig
): Promise<void> {
  const blob = await generateContractPdf(contract, company, config);
  downloadBlob(blob, `contrato-${contract.contract_number}.pdf`);
}
