import { renderTemplate } from "@/hooks/useTemplates";

interface PDFGeneratorOptions {
  template: string;
  data: Record<string, unknown>;
  filename?: string;
}

// Convert HTML to printable format
export function generatePrintableHTML(options: PDFGeneratorOptions): string {
  const { template, data } = options;
  
  const renderedContent = renderTemplate(template, data);
  
  const htmlDocument = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: white;
    }
    
    .document {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    
    .company-info h1 {
      font-size: 24px;
      color: #1a1a1a;
    }
    
    .document-info {
      text-align: right;
    }
    
    .document-number {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    
    .client-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .client-details {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
    }
    
    .services-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .services-table th {
      background: #333;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    .services-table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    
    .services-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .text-right {
      text-align: right;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-table {
      width: 250px;
    }
    
    .totals-table tr td {
      padding: 8px 12px;
    }
    
    .totals-table .total-row {
      font-size: 16px;
      font-weight: bold;
      background: #333;
      color: white;
    }
    
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background: #f8f8f8;
      border-radius: 4px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    
    .dates-section {
      display: flex;
      gap: 30px;
      margin-bottom: 20px;
    }
    
    .date-item {
      display: flex;
      gap: 10px;
    }
    
    .date-label {
      color: #666;
    }
    
    .date-value {
      font-weight: 600;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-active { background: #d4edda; color: #155724; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .document {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    ${renderedContent}
  </div>
</body>
</html>
`;

  return htmlDocument;
}

// Open print dialog with the generated HTML
export function printDocument(options: PDFGeneratorOptions): void {
  const html = generatePrintableHTML(options);
  
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}

// Download as HTML file (can be opened and printed)
export function downloadDocument(options: PDFGeneratorOptions): void {
  const html = generatePrintableHTML(options);
  const filename = options.filename || "documento.html";
  
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format contract data for template
export function formatContractData(contract: Record<string, unknown>): Record<string, unknown> {
  const client = contract.client as Record<string, unknown> | undefined;
  const services = contract.services as Array<Record<string, unknown>> | undefined;
  
  return {
    contract_number: contract.contract_number,
    contract_name: contract.name || `Contrato #${contract.contract_number}`,
    start_date: formatDate(contract.start_date as string),
    end_date: contract.end_date ? formatDate(contract.end_date as string) : "Indefinido",
    billing_period: getBillingPeriodLabel(contract.billing_period as string),
    subtotal: formatCurrency(contract.subtotal as number),
    iva_total: formatCurrency(contract.iva_total as number),
    total: formatCurrency(contract.total as number),
    notes: contract.notes || "",
    
    // Client data
    client_name: client?.name || "",
    client_cif: client?.cif || "",
    client_address: client?.address || "",
    client_city: client?.city || "",
    client_province: client?.province || "",
    client_postal_code: client?.postal_code || "",
    client_email: client?.email || "",
    client_phone: client?.phone || "",
    
    // Services
    services: services?.map((s) => {
      const service = s.service as Record<string, unknown> | undefined;
      return {
        name: service?.name || "",
        quantity: s.quantity,
        unit_price: formatCurrency(s.unit_price as number),
        discount_percent: s.discount_percent,
        subtotal: formatCurrency(s.subtotal as number),
        iva_percent: s.iva_percent,
        iva_amount: formatCurrency(s.iva_amount as number),
        total: formatCurrency(s.total as number),
      };
    }) || [],
    
    // Meta
    current_date: formatDate(new Date().toISOString()),
  };
}

// Format invoice data for template
export function formatInvoiceData(invoice: Record<string, unknown>): Record<string, unknown> {
  const client = invoice.client as Record<string, unknown> | undefined;
  const services = invoice.services as Array<Record<string, unknown>> | undefined;
  
  return {
    invoice_number: invoice.invoice_number,
    issue_date: formatDate(invoice.issue_date as string),
    due_date: invoice.due_date ? formatDate(invoice.due_date as string) : "",
    subtotal: formatCurrency(invoice.subtotal as number),
    iva_amount: formatCurrency(invoice.iva_amount as number),
    total: formatCurrency(invoice.total as number),
    notes: invoice.notes || "",
    status: getInvoiceStatusLabel(invoice.status as string),
    
    // Client data
    client_name: client?.name || "",
    client_cif: client?.cif || "",
    client_email: client?.email || "",
    client_iban: client?.iban || "",
    
    // Services
    services: services?.map((s) => {
      const service = s.service as Record<string, unknown> | undefined;
      return {
        name: service?.name || s.description || "",
        quantity: s.quantity,
        unit_price: formatCurrency(s.unit_price as number),
        discount_percent: s.discount_percent,
        subtotal: formatCurrency(s.subtotal as number),
        iva_percent: s.iva_percent,
        iva_amount: formatCurrency(s.iva_amount as number),
        total: formatCurrency(s.total as number),
      };
    }) || [],
    
    // Meta
    current_date: formatDate(new Date().toISOString()),
  };
}

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0,00 €";
  return Number(amount).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function getBillingPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    monthly: "Mensual",
    quarterly: "Trimestral",
    annual: "Anual",
    one_time: "Puntual",
    other: "Otro",
  };
  return labels[period] || period;
}

function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Borrador",
    issued: "Emitida",
    paid: "Pagada",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
}
