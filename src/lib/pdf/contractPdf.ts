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
  pdfToBlob,
  blobToBase64,
  downloadBlob,
  drawFooter,
  drawLegalClauses,
  drawSignatureArea,
  replaceClauseVariables,
  hexToRgb,
  embedLogo,
  drawLogo,
  CompanyData,
  ClientData,
  PdfConfig,
  PdfSections,
  getDefaultSections,
  LegalClause,
  DEFAULT_LEGAL_CLAUSES,
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
    mensual: 'Mensual',
    trimestral: 'Trimestral',
    anual: 'Anual',
    unico: 'Pago único',
  };
  return labels[period || ''] || period || '-';
}

function getStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    active: 'Activo',
    expired: 'Expirado',
    cancelled: 'Cancelado',
    pending_activation: 'Pendiente',
    vigente: 'Vigente',
    expirado: 'Expirado',
    cancelado: 'Cancelado',
    pendiente_activacion: 'Pendiente',
  };
  return labels[status || ''] || status || '-';
}

function formatContractNumber(num: number): string {
  return `CT-${String(num).padStart(4, '0')}`;
}

/**
 * Generate Contract PDF using Visual config (sections + section_order)
 * Uses the same block-based approach as Invoice/Quote
 */
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
  
  // Get section configuration
  const defaultSections = getDefaultSections();
  const sections: PdfSections = config?.sections 
    ? { 
        ...defaultSections,
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

  console.log('[PDF Contract] Using Visual config - sections:', Object.keys(sections).filter(k => (sections as any)[k]?.visible));

  // Get legal clauses (use config or defaults)
  const rawClauses: LegalClause[] = config?.legal_clauses || DEFAULT_LEGAL_CLAUSES;
  const showSignatures = config?.show_signatures !== false && sections.signatures?.visible !== false;
  const showLegalClauses = sections.legal?.visible !== false;
  
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
  // PÁGINA 1: Información del contrato (Visual layout)
  // =============================================
  const pages: ReturnType<typeof addPage>[] = [];
  let page1 = addPage(pdfDoc);
  
  const left = margin;
  const right = A4_WIDTH - margin;
  const contentWidth = right - left;
  pages.push(page1);
  let y = A4_HEIGHT - margin;
  
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
        drawLogo(page1, logo, logoPosition, y);
        y -= scaledHeight + sections.header.spacing;
      }
    }

    // Company name
    page1.drawText(company.name || 'Mi Empresa', {
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
      page1.drawText(line.substring(0, 55), {
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
    
    const titleText = sections.title.text || config?.title_text || 'CONTRATO';
    const titleSize = sections.title.size || 28;
    const titleWidth = fonts.bold.widthOfTextAtSize(titleText, titleSize);
    const titleColor = config?.title_color ? hexToRgb(config.title_color) : null;
    
    page1.drawText(titleText, {
      x: (A4_WIDTH - titleWidth) / 2,
      y,
      size: titleSize,
      font: fonts.bold,
      color: titleColor ? rgb(titleColor.r, titleColor.g, titleColor.b) : pdfColors.primary,
    });

    // Contract number below title
    const numberText = `Nº ${formatContractNumber(contract.contract_number)}`;
    const numberSize = 16;
    const numberWidth = fonts.regular.widthOfTextAtSize(numberText, numberSize);
    
    y -= sections.title.spacing;
    
    page1.drawText(numberText, {
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

    page1.drawText('Fecha inicio:', {
      x: left,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    page1.drawText(formatDate(contract.start_date), {
      x: left + 80,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });

    if (contract.end_date) {
      page1.drawText('Fecha fin:', {
        x: left + 200,
        y,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      page1.drawText(formatDate(contract.end_date), {
        x: left + 270,
        y,
        size: fontSize - 1,
        font: fonts.bold,
        color: pdfColors.text,
      });
    }

    y -= sections.dates.spacing / 2;

    // Second row: billing period and status
    page1.drawText('Facturación:', {
      x: left,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    page1.drawText(getBillingPeriodLabel(contract.billing_period), {
      x: left + 80,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });

    page1.drawText('Estado:', {
      x: left + 200,
      y,
      size: fontSize - 1,
      font: fonts.regular,
      color: pdfColors.secondary,
    });
    page1.drawText(getStatusLabel(contract.status), {
      x: left + 270,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.text,
    });

    y -= sections.dates.spacing;
  }

  // ============ CLIENT SECTION ============
  if (sections.client.visible) {
    y -= sections.client.margin_top;
    
    const boxPadding = sections.client.padding;
    const clientLineSpacing = sections.client.spacing;
    const clientBoxColor = sections.client.background_color || '#f8f9fa';
    
    // Calculate box height based on content
    const clientLineCount = 2 + (clientData.address ? 1 : 0) + (clientData.cif ? 1 : 0);
    const boxHeight = Math.max(78, boxPadding * 2 + 18 + clientLineCount * clientLineSpacing);
    const clientBoxRgb = hexToRgb(clientBoxColor);

    // Draw client box background
    page1.drawRectangle({
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
      page1.drawRectangle({
        x: left,
        y: y - boxHeight,
        width: contentWidth,
        height: boxHeight,
        borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
        borderWidth: 1,
      });
    }

    let boxY = y - boxPadding - 10;
    page1.drawText('CLIENTE', {
      x: left + boxPadding,
      y: boxY,
      size: fontSize - 2,
      font: fonts.bold,
      color: pdfColors.secondary,
    });
    boxY -= clientLineSpacing;

    page1.drawText(clientData.name || '', {
      x: left + boxPadding,
      y: boxY,
      size: fontSize + 1,
      font: fonts.bold,
      color: pdfColors.text,
    });
    boxY -= clientLineSpacing;

    if (clientData.address) {
      page1.drawText(clientData.address.substring(0, 70), {
        x: left + boxPadding,
        y: boxY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });
      boxY -= clientLineSpacing;
    }

    if (clientData.cif) {
      page1.drawText(`CIF: ${clientData.cif}`, {
        x: left + boxPadding,
        y: boxY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });
    }

    y = y - boxHeight;
  }
  
  // Contract name if exists
  if (contract.name) {
    y -= 15;
    page1.drawText(contract.name, {
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
    page1.drawRectangle({
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
      { label: 'Servicio', x: colDescX, align: 'left' as const },
      { label: 'Cant.', x: colQtyX, align: 'right' as const },
      { label: 'Precio', x: colUnitX, align: 'right' as const },
      { label: 'Total', x: colTotX, align: 'right' as const },
    ];

    cols.forEach((c) => {
      const textWidth = fonts.bold.widthOfTextAtSize(c.label, fontSize - 1);
      const x = c.align === 'right' ? c.x - textWidth : c.x;
      page1.drawText(c.label, {
        x,
        y: y - headerHeight + (headerHeight - (fontSize - 1)) / 2 - 1,
        size: fontSize - 1,
        font: fonts.bold,
        color: pdfColors.white,
      });
    });

    y -= headerHeight;

    // Service rows (only active services)
    const services = (contract.services || []).filter(s => s.is_active !== false);

    services.forEach((svc, idx) => {
      const rowBottomY = y - rowHeight;

      // Alternate row background
      if (idx % 2 === 1) {
        page1.drawRectangle({
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

      page1.drawText(desc, {
        x: colDescX,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const qtyW = fonts.regular.widthOfTextAtSize(qty, fontSize - 1);
      page1.drawText(qty, {
        x: colQtyX - qtyW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const unitW = fonts.regular.widthOfTextAtSize(unit, fontSize - 1);
      page1.drawText(unit, {
        x: colUnitX - unitW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      const totW = fonts.regular.widthOfTextAtSize(tot, fontSize - 1);
      page1.drawText(tot, {
        x: colTotX - totW,
        y: textY,
        size: fontSize - 1,
        font: fonts.regular,
        color: pdfColors.text,
      });

      // Divider line at bottom of row
      if (showTableBorders) {
        drawLine(
          page1,
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
      { label: 'Subtotal:', value: formatCurrency(contract.subtotal || 0), bold: false },
      { label: 'IVA (21%):', value: formatCurrency(contract.iva_total || 0), bold: false },
      { label: 'TOTAL:', value: formatCurrency(contract.total || 0), bold: true },
    ];

    let currentY = y;
    rows.forEach((r, i) => {
      const isTotal = r.bold;
      const size = isTotal ? 18 : fontSize;
      const font = isTotal ? fonts.bold : fonts.regular;
      const color = isTotal ? pdfColors.primary : pdfColors.secondary;

      page1.drawText(r.label, {
        x: totalsX,
        y: currentY,
        size,
        font,
        color,
      });

      const vW = font.widthOfTextAtSize(r.value, size);
      page1.drawText(r.value, {
        x: right - vW,
        y: currentY,
        size,
        font,
        color,
      });

      if (showTotalsLines && i < rows.length - 1) {
        const lineY = currentY - 3;
        drawLine(
          page1,
          totalsX,
          lineY,
          right,
          lineY,
          rgb(totalsLineRgb.r, totalsLineRgb.g, totalsLineRgb.b),
          0.5,
        );
      }

      currentY -= totalsLineSpacing;
    });

    y = currentY;

    // Billing period note
    page1.drawText(`Importe por período: ${getBillingPeriodLabel(contract.billing_period)}`, {
      x: left,
      y: y + 10,
      size: fontSize - 2,
      font: fonts.regular,
      color: pdfColors.muted,
    });
  }
  
  // ============ NOTES SECTION ============
  if (showNotes && contract.notes) {
    y -= 25;
    page1.drawText('Observaciones:', {
      x: left,
      y,
      size: fontSize - 1,
      font: fonts.bold,
      color: pdfColors.muted,
    });
    y -= 14;
    
    const noteLines = contract.notes.split('\n').slice(0, 3);
    noteLines.forEach((line) => {
      page1.drawText(line.substring(0, 80), {
        x: left,
        y,
        size: fontSize - 2,
        font: fonts.regular,
        color: pdfColors.secondary,
      });
      y -= 12;
    });
  }
  
  // ============ SIGNATURE ON PAGE 1 ============
  if (showSignatures) {
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
      y2 -= 28;
      
      // ============ LEGAL CLAUSES ============
      y2 = drawLegalClauses(page2, legalClauses, fonts, y2, pdfColors, {
        clauseSpacing: sections.legal?.clause_spacing || 15,
        titleSize: sections.legal?.title_size || 9,
        contentSize: fontSize - 2,
      });
      
      // ============ FINAL SIGNATURE ============
      if (showSignatures) {
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
