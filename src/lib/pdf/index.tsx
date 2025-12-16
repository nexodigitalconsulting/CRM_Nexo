import { pdf } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import QuotePDF from './QuotePDF';
import ContractPDF from './ContractPDF';

// Helper functions for data formatting
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0,00 €';
  return Number(amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function getBillingPeriodLabel(period: string): string {
  const labels: Record<string, string> = { monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual', one_time: 'Puntual', other: 'Otro' };
  return labels[period] || period;
}

function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = { draft: 'Borrador', issued: 'Emitida', paid: 'Pagada', cancelled: 'Cancelada' };
  return labels[status] || status;
}

function getQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', rejected: 'Rechazado' };
  return labels[status] || status;
}

// Generate Invoice PDF Blob
export async function generateInvoicePdfBlob(
  invoice: Record<string, unknown>,
  companySettings?: Record<string, unknown>
): Promise<Blob> {
  const client = invoice.client as Record<string, unknown> | undefined;
  const services = invoice.services as Array<Record<string, unknown>> | undefined;

  const props = {
    invoiceNumber: `FF-${String(invoice.invoice_number).padStart(4, '0')}`,
    issueDate: formatDate(invoice.issue_date as string),
    dueDate: invoice.due_date ? formatDate(invoice.due_date as string) : undefined,
    status: getInvoiceStatusLabel(invoice.status as string),
    clientName: (client?.name as string) || '',
    clientCif: client?.cif as string,
    clientAddress: client?.address as string,
    clientEmail: client?.email as string,
    clientIban: client?.iban as string,
    companyName: (companySettings?.name as string) || '',
    companyCif: companySettings?.cif as string,
    companyAddress: companySettings?.address as string,
    companyEmail: companySettings?.email as string,
    companyPhone: companySettings?.phone as string,
    companyIban: companySettings?.iban as string,
    services: services?.map((s) => {
      const service = s.service as Record<string, unknown> | undefined;
      return {
        name: (service?.name as string) || (s.description as string) || '',
        quantity: (s.quantity as number) || 1,
        unit_price: formatCurrency(s.unit_price as number),
        discount_percent: s.discount_percent as number,
        subtotal: formatCurrency(s.subtotal as number),
        iva_percent: s.iva_percent as number,
        total: formatCurrency(s.total as number),
      };
    }) || [],
    subtotal: formatCurrency(invoice.subtotal as number),
    ivaAmount: formatCurrency(invoice.iva_amount as number),
    total: formatCurrency(invoice.total as number),
    notes: invoice.notes as string,
  };

  const blob = await pdf(<InvoicePDF {...props} />).toBlob();
  return blob;
}

// Generate Quote PDF Blob
export async function generateQuotePdfBlob(
  quote: Record<string, unknown>,
  companySettings?: Record<string, unknown>
): Promise<Blob> {
  const client = quote.client as Record<string, unknown> | undefined;
  const contact = quote.contact as Record<string, unknown> | undefined;
  const services = quote.services as Array<Record<string, unknown>> | undefined;

  const props = {
    quoteNumber: `PP-${String(quote.quote_number).padStart(4, '0')}`,
    quoteName: quote.name as string,
    validUntil: quote.valid_until ? formatDate(quote.valid_until as string) : undefined,
    status: getQuoteStatusLabel(quote.status as string),
    clientName: (client?.name as string) || (contact?.name as string) || '',
    clientCif: client?.cif as string,
    clientAddress: client?.address as string,
    clientEmail: (client?.email as string) || (contact?.email as string),
    clientPhone: (client?.phone as string) || (contact?.phone as string),
    companyName: (companySettings?.name as string) || '',
    companyCif: companySettings?.cif as string,
    companyAddress: companySettings?.address as string,
    companyEmail: companySettings?.email as string,
    companyPhone: companySettings?.phone as string,
    services: services?.map((s) => {
      const service = s.service as Record<string, unknown> | undefined;
      return {
        name: (service?.name as string) || '',
        quantity: (s.quantity as number) || 1,
        unit_price: formatCurrency(s.unit_price as number),
        discount_percent: s.discount_percent as number,
        subtotal: formatCurrency(s.subtotal as number),
        iva_percent: s.iva_percent as number,
        total: formatCurrency(s.total as number),
      };
    }) || [],
    subtotal: formatCurrency(quote.subtotal as number),
    ivaTotal: formatCurrency(quote.iva_total as number),
    total: formatCurrency(quote.total as number),
    notes: quote.notes as string,
    currentDate: formatDate(new Date().toISOString()),
  };

  const blob = await pdf(<QuotePDF {...props} />).toBlob();
  return blob;
}

// Generate Contract PDF Blob
export async function generateContractPdfBlob(
  contract: Record<string, unknown>,
  companySettings?: Record<string, unknown>
): Promise<Blob> {
  const client = contract.client as Record<string, unknown> | undefined;
  const services = contract.services as Array<Record<string, unknown>> | undefined;

  const props = {
    contractNumber: `CN-${String(contract.contract_number).padStart(4, '0')}`,
    contractName: contract.name as string,
    startDate: formatDate(contract.start_date as string),
    endDate: contract.end_date ? formatDate(contract.end_date as string) : undefined,
    billingPeriod: getBillingPeriodLabel(contract.billing_period as string),
    status: (contract.status as string) || '',
    clientName: (client?.name as string) || '',
    clientCif: client?.cif as string,
    clientAddress: client?.address as string,
    clientCity: client?.city as string,
    clientProvince: client?.province as string,
    clientPostalCode: client?.postal_code as string,
    clientEmail: client?.email as string,
    clientPhone: client?.phone as string,
    companyName: (companySettings?.name as string) || '',
    companyCif: companySettings?.cif as string,
    companyAddress: companySettings?.address as string,
    companyCity: companySettings?.city as string,
    companyEmail: companySettings?.email as string,
    companyPhone: companySettings?.phone as string,
    companyIban: companySettings?.iban as string,
    services: services?.map((s) => {
      const service = s.service as Record<string, unknown> | undefined;
      return {
        name: (service?.name as string) || '',
        quantity: (s.quantity as number) || 1,
        unit_price: formatCurrency(s.unit_price as number),
        discount_percent: s.discount_percent as number,
        subtotal: formatCurrency(s.subtotal as number),
        iva_percent: s.iva_percent as number,
        total: formatCurrency(s.total as number),
      };
    }) || [],
    subtotal: formatCurrency(contract.subtotal as number),
    ivaTotal: formatCurrency(contract.iva_total as number),
    total: formatCurrency(contract.total as number),
    notes: contract.notes as string,
    currentDate: formatDate(new Date().toISOString()),
  };

  const blob = await pdf(<ContractPDF {...props} />).toBlob();
  return blob;
}

// Convert blob to base64 for email attachment
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Download PDF directly
export async function downloadPdf(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
