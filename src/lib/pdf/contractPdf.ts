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
  hexToRgb,
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
  
  // Use dynamic margin from config (fallback to default MARGIN constant)
  const margin = config?.margins || MARGIN;
  const sectionSpacing = config?.section_spacing || 28;
  const tableRowHeight = config?.row_height || 22;
  const lineSpacing = config?.line_spacing || 14;
  
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
  
  // =============================================
  // PÁGINA 1: Información del contrato
  // =============================================
  const pages: ReturnType<typeof addPage>[] = [];
  let page1 = addPage(pdfDoc);
  
  // Use content width based on dynamic margin
  const contentWidth = A4_WIDTH - margin * 2;
  pages.push(page1);
  let y = A4_HEIGHT - margin;
  
  // ============ HEADER SECTION ============
  // Use logo_size from sections config
  const logoMaxHeight = sections.header.logo_size || 60;
  y = await drawCompanyHeaderWithLogo(pdfDoc, page1, company, fonts, y, {
    ...config,
    sections: {
      ...sections,
      header: { ...sections.header, logo_size: logoMaxHeight },
    },
  });
  
  // Document title (right side)
  drawDocumentTitle(page1, 'CONTRATO', contract.contract_number, fonts, A4_HEIGHT - margin - 20, pdfColors);
  
  // Separator line
  y -= 10;
  drawLine(page1, margin, y, A4_WIDTH - margin, y, pdfColors.border, 1);
  y -= sectionSpacing;
  
  // ============ CONTRACT DETAILS ============
  const detailsX = A4_WIDTH - margin - 150;
  let detailY = y + 10;
  
  page1.drawText('Fecha inicio:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page1.drawText(formatDate(contract.start_date), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  detailY -= lineSpacing;
  
  if (contract.end_date) {
    page1.drawText('Fecha fin:', {
      x: detailsX,
      y: detailY,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.muted,
    });
    page1.drawText(formatDate(contract.end_date), {
      x: detailsX + 80,
      y: detailY,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
    detailY -= lineSpacing;
  }
  
  page1.drawText('Facturación:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page1.drawText(getBillingPeriodLabel(contract.billing_period), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  detailY -= lineSpacing;
  
  page1.drawText('Estado:', {
    x: detailsX,
    y: detailY,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  page1.drawText(getStatusLabel(contract.status), {
    x: detailsX + 80,
    y: detailY,
    size: fontSize - 1,
    font: fonts.bold,
    color: pdfColors.text,
  });
  
  // ============ CLIENT SECTION ============
  y = drawClientSection(page1, clientData, fonts, y, pdfColors, fontSize);
  
  // Contract name if exists
  if (contract.name) {
    y -= 10;
    page1.drawText(contract.name, {
      x: margin,
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
    { label: 'Servicio', x: margin + 5, width: 250 },
    { label: 'Cant.', x: margin + 260, width: 40 },
    { label: 'Precio', x: margin + 310, width: 70 },
    { label: 'Dto.', x: margin + 380, width: 50 },
    { label: 'Total', x: margin + 440, width: 70 },
  ] : [
    { label: 'Servicio', x: margin + 5, width: 280 },
    { label: 'Cant.', x: margin + 290, width: 50 },
    { label: 'Precio', x: margin + 350, width: 80 },
    { label: 'Total', x: margin + 440, width: 70 },
  ];
  
  // Use headerHeight from sections config
  const tableHeaderHeight = sections.table.header_height || 25;
  const tableHeaderColorHex = config?.table_header_color;
  const tableHeaderBg = tableHeaderColorHex ? hexToRgb(tableHeaderColorHex) : undefined;
  
  y = drawTableHeader(page1, y, columns, fonts, pdfColors, fontSize - 1, tableHeaderHeight, tableHeaderBg);
  
  // Service rows (only active services)
  const services = (contract.services || []).filter(s => s.is_active !== false);
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
    
    // Use tableRowHeight from config
    y = drawTableRow(page1, y, values, fonts, index % 2 === 1, fontSize - 1, tableRowHeight);
  });
  
  // Bottom line of table
  y -= 5;
  drawLine(page1, margin, y, A4_WIDTH - margin, y, pdfColors.border, 0.5);
  y -= sectionSpacing;
  
  // ============ TOTALS ============
  y = drawTotals(
    page1,
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
  page1.drawText(periodNote, {
    x: margin,
    y,
    size: fontSize - 1,
    font: fonts.regular,
    color: pdfColors.muted,
  });
  
  // ============ NOTES ============
  if (showNotes && contract.notes) {
    y -= sectionSpacing;
    page1.drawText('Observaciones:', {
      x: margin,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.muted,
    });
    y -= lineSpacing;
    
    const noteLines = contract.notes.split('\n').slice(0, 3);
    noteLines.forEach((line) => {
      page1.drawText(line.substring(0, 80), {
        x: margin,
        y,
        size: fontSize - 2,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      y -= 12;
    });
  }
  
  // ============ SIGNATURE ON PAGE 1 ============
  if (showSignatures && sections.signatures?.visible !== false) {
    // Position signature at the bottom of page 1
    y = Math.min(y - 40, margin + 120);
    
    y = drawSignatureArea(page1, fonts, y, pdfColors, {
      lineWidth: sections.signatures?.line_width || 180,
      labelSize: sections.signatures?.label_size || 9,
      companyName: company.name || 'El Prestador',
      clientName: clientData.name || 'El Cliente',
    });
  }
  
  // =============================================
  // PÁGINA 2: Cláusulas legales y firma final
  // =============================================
  if (showLegalClauses) {
    const visibleClauses = legalClauses.filter(c => c.visible);
    if (visibleClauses.length > 0) {
      let page2 = addPage(pdfDoc);
      pages.push(page2);
      let y2 = A4_HEIGHT - margin;
      
      // Small header for page 2
      page2.drawText(company.name || 'Empresa', {
        x: margin,
        y: y2,
        size: fontSize + 2,
        font: fonts.bold,
        color: pdfColors.primary,
      });
      
      page2.drawText(`CONTRATO Nº ${contract.contract_number} - CONDICIONES GENERALES`, {
        x: A4_WIDTH - margin - 250,
        y: y2,
        size: fontSize,
        font: fonts.bold,
        color: pdfColors.text,
      });
      
      y2 -= 15;
      drawLine(page2, margin, y2, A4_WIDTH - margin, y2, pdfColors.border, 1);
      y2 -= sectionSpacing;
      
      // ============ LEGAL CLAUSES ============
      y2 = drawLegalClauses(page2, legalClauses, fonts, y2, pdfColors, {
        clauseSpacing: sections.legal?.clause_spacing || 15,
        titleSize: sections.legal?.title_size || 9,
        contentSize: fontSize - 2,
      });
      
      // ============ FINAL SIGNATURE ============
      if (showSignatures && sections.signatures?.visible !== false) {
        // Position signature at bottom of page 2
        y2 = Math.min(y2 - 30, margin + 100);
        
        page2.drawText('ACEPTACIÓN DEL CONTRATO', {
          x: margin,
          y: y2 + 30,
          size: fontSize,
          font: fonts.bold,
          color: pdfColors.primary,
        });
        
        page2.drawText('Ambas partes declaran haber leído y aceptado las condiciones del presente contrato.', {
          x: margin,
          y: y2 + 15,
          size: fontSize - 2,
          font: fonts.regular,
          color: pdfColors.muted,
        });
        
        y2 = drawSignatureArea(page2, fonts, y2, pdfColors, {
          lineWidth: sections.signatures?.line_width || 180,
          labelSize: sections.signatures?.label_size || 9,
          companyName: company.name || 'El Prestador',
          clientName: clientData.name || 'El Cliente',
        });
      }
    }
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
