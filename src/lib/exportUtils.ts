import { format } from "date-fns";

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const headers = columns.map((col) => col.label);
  
  const rows = data.map((row) =>
    columns.map((col) => {
      const keys = String(col.key).split(".");
      let value: any = row;
      for (const key of keys) {
        value = value?.[key];
      }
      
      if (col.format) {
        value = col.format(value, row);
      }
      
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
  );

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = "Data"
): void {
  const headers = columns.map((col) => col.label);
  
  const rows = data.map((row) =>
    columns.map((col) => {
      const keys = String(col.key).split(".");
      let value: any = row;
      for (const key of keys) {
        value = value?.[key];
      }
      
      if (col.format) {
        return col.format(value, row);
      }
      
      return value ?? "";
    })
  );

  // Create Excel XML format
  const escapeXml = (str: string) => 
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerRow = headers
    .map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join("");

  const dataRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const type = typeof cell === "number" ? "Number" : "String";
            return `<Cell><Data ss:Type="${type}">${escapeXml(String(cell))}</Data></Cell>`;
          })
          .join("")}</Row>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
      <Row>${headerRow}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.xls`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Pre-configured export functions for each entity
export const entityExportConfigs = {
  contacts: {
    columns: [
      { key: "contact_number", label: "Nº Contacto" },
      { key: "name", label: "Nombre" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Teléfono" },
      { key: "status", label: "Estado" },
      { key: "source", label: "Origen" },
      { key: "created_at", label: "Fecha Creación", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
    ],
    filename: "contactos",
  },
  clients: {
    columns: [
      { key: "client_number", label: "Nº Cliente" },
      { key: "name", label: "Nombre" },
      { key: "cif", label: "CIF" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Teléfono" },
      { key: "address", label: "Dirección" },
      { key: "city", label: "Ciudad" },
      { key: "status", label: "Estado" },
      { key: "segment", label: "Segmento" },
    ],
    filename: "clientes",
  },
  quotes: {
    columns: [
      { key: "quote_number", label: "Nº Presupuesto", format: (v: number) => `PP-${String(v).padStart(4, "0")}` },
      { key: "name", label: "Nombre" },
      { key: "client.name", label: "Cliente" },
      { key: "contact.name", label: "Contacto" },
      { key: "subtotal", label: "Subtotal", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "iva_total", label: "IVA", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "total", label: "Total", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "status", label: "Estado" },
      { key: "valid_until", label: "Válido hasta", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
    ],
    filename: "presupuestos",
  },
  invoices: {
    columns: [
      { key: "invoice_number", label: "Nº Factura", format: (v: number) => `FF-${String(v).padStart(4, "0")}` },
      { key: "client.name", label: "Cliente" },
      { key: "issue_date", label: "Fecha Emisión", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "due_date", label: "Fecha Vencimiento", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "subtotal", label: "Subtotal", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "iva_amount", label: "IVA", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "total", label: "Total", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "status", label: "Estado" },
    ],
    filename: "facturas",
  },
  contracts: {
    columns: [
      { key: "contract_number", label: "Nº Contrato", format: (v: number) => `CN-${String(v).padStart(4, "0")}` },
      { key: "name", label: "Nombre" },
      { key: "client.name", label: "Cliente" },
      { key: "start_date", label: "Fecha Inicio", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "end_date", label: "Fecha Fin", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "billing_period", label: "Periodicidad" },
      { key: "total", label: "Total", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "status", label: "Estado" },
    ],
    filename: "contratos",
  },
  expenses: {
    columns: [
      { key: "expense_number", label: "Nº Gasto", format: (v: number) => `GT-${String(v).padStart(4, "0")}` },
      { key: "supplier_name", label: "Proveedor" },
      { key: "supplier_cif", label: "CIF Proveedor" },
      { key: "invoice_number", label: "Nº Factura" },
      { key: "concept", label: "Concepto" },
      { key: "issue_date", label: "Fecha Emisión", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "subtotal", label: "Subtotal", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "iva_amount", label: "IVA", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "irpf_amount", label: "IRPF", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "total", label: "Total", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "status", label: "Estado" },
    ],
    filename: "gastos",
  },
  remittances: {
    columns: [
      { key: "remittance_number", label: "Nº Remesa", format: (v: number) => `RM-${String(v).padStart(4, "0")}` },
      { key: "code", label: "Código" },
      { key: "issue_date", label: "Fecha Emisión", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "invoice_count", label: "Nº Facturas" },
      { key: "total_amount", label: "Importe Total", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "status", label: "Estado" },
    ],
    filename: "remesas",
  },
};
