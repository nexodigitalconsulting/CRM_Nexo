import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, FileText, Receipt, TrendingUp, Package } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import {
  useInvoiceProducts,
  useQuoteProducts,
  useProductStats,
  InvoiceProduct,
  QuoteProduct,
} from "@/hooks/useProductAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-ES");

const invoiceStatusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  draft: "inactive",
  issued: "pending",
  paid: "active",
  cancelled: "danger",
};

const quoteStatusMap: Record<string, "inactive" | "new" | "active" | "danger"> = {
  draft: "inactive",
  sent: "new",
  approved: "active",
  rejected: "danger",
};

const invoiceColumnConfigs: ColumnConfig[] = [
  { key: "invoice_number", label: "Nº Factura", defaultVisible: true },
  { key: "invoice_date", label: "Fecha", defaultVisible: true },
  { key: "invoice_status", label: "Estado Factura", defaultVisible: true },
  { key: "client_name", label: "Cliente", defaultVisible: true },
  { key: "client_cif", label: "CIF Cliente", defaultVisible: false },
  { key: "service_name", label: "Producto/Servicio", defaultVisible: true },
  { key: "service_category", label: "Categoría", defaultVisible: true },
  { key: "quantity", label: "Cantidad", defaultVisible: true },
  { key: "unit_price", label: "Precio Unitario", defaultVisible: true },
  { key: "discount_percent", label: "% Descuento", defaultVisible: false },
  { key: "subtotal", label: "Subtotal", defaultVisible: false },
  { key: "iva_percent", label: "% IVA", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
];

const quoteColumnConfigs: ColumnConfig[] = [
  { key: "quote_number", label: "Nº Presupuesto", defaultVisible: true },
  { key: "quote_date", label: "Fecha", defaultVisible: true },
  { key: "quote_status", label: "Estado", defaultVisible: true },
  { key: "client_name", label: "Cliente", defaultVisible: true },
  { key: "contact_name", label: "Contacto", defaultVisible: true },
  { key: "service_name", label: "Producto/Servicio", defaultVisible: true },
  { key: "service_category", label: "Categoría", defaultVisible: true },
  { key: "quantity", label: "Cantidad", defaultVisible: true },
  { key: "unit_price", label: "Precio Unitario", defaultVisible: true },
  { key: "discount_percent", label: "% Descuento", defaultVisible: false },
  { key: "subtotal", label: "Subtotal", defaultVisible: false },
  { key: "iva_percent", label: "% IVA", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
];

export default function ProductAnalysis() {
  const { data: invoiceProducts = [], isLoading: loadingInvoices } = useInvoiceProducts();
  const { data: quoteProducts = [], isLoading: loadingQuotes } = useQuoteProducts();
  const { invoiceStats, quoteStats } = useProductStats();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("invoices");

  // Table views
  const { data: defaultInvoiceView } = useDefaultTableView("invoice_products");
  const { data: defaultQuoteView } = useDefaultTableView("quote_products");

  const [invoiceVisibleColumns, setInvoiceVisibleColumns] = useState<string[]>(
    invoiceColumnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [quoteVisibleColumns, setQuoteVisibleColumns] = useState<string[]>(
    quoteColumnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  // Apply default views when loaded
  if (defaultInvoiceView && invoiceVisibleColumns.length === invoiceColumnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultInvoiceView.visible_columns as string[];
    if (cols.length > 0) setInvoiceVisibleColumns(cols);
  }
  if (defaultQuoteView && quoteVisibleColumns.length === quoteColumnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultQuoteView.visible_columns as string[];
    if (cols.length > 0) setQuoteVisibleColumns(cols);
  }

  const filteredInvoiceProducts = invoiceProducts.filter((p) =>
    p.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.service_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuoteProducts = quoteProducts.filter((p) =>
    p.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.service_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invoiceColumns = [
    {
      key: "invoice_number",
      label: "Nº Factura",
      render: (p: InvoiceProduct) => (
        <span className="font-mono text-xs">FF-{String(p.invoice_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "invoice_date",
      label: "Fecha",
      render: (p: InvoiceProduct) => <span className="text-sm">{formatDate(p.invoice_date)}</span>,
    },
    {
      key: "invoice_status",
      label: "Estado",
      render: (p: InvoiceProduct) => (
        <StatusBadge variant={invoiceStatusMap[p.invoice_status || "draft"]}>
          {p.invoice_status === "paid" ? "Cobrada" : p.invoice_status === "issued" ? "Emitida" : p.invoice_status}
        </StatusBadge>
      ),
    },
    {
      key: "client_name",
      label: "Cliente",
      render: (p: InvoiceProduct) => <span className="font-medium">{p.client_name}</span>,
    },
    {
      key: "client_cif",
      label: "CIF",
      render: (p: InvoiceProduct) => <span className="text-sm text-muted-foreground">{p.client_cif || "-"}</span>,
    },
    {
      key: "service_name",
      label: "Producto",
      render: (p: InvoiceProduct) => (
        <div>
          <p className="font-medium">{p.service_name}</p>
          {p.service_category && <p className="text-xs text-muted-foreground">{p.service_category}</p>}
        </div>
      ),
    },
    {
      key: "service_category",
      label: "Categoría",
      render: (p: InvoiceProduct) => <span className="text-sm">{p.service_category || "-"}</span>,
    },
    {
      key: "quantity",
      label: "Cant.",
      render: (p: InvoiceProduct) => <span>{p.quantity}</span>,
    },
    {
      key: "unit_price",
      label: "P. Unit.",
      render: (p: InvoiceProduct) => <span className="text-sm">{formatCurrency(Number(p.unit_price))}</span>,
    },
    {
      key: "discount_percent",
      label: "% Dto.",
      render: (p: InvoiceProduct) => <span className="text-sm">{p.discount_percent || 0}%</span>,
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (p: InvoiceProduct) => <span className="text-sm">{formatCurrency(Number(p.subtotal))}</span>,
    },
    {
      key: "iva_percent",
      label: "% IVA",
      render: (p: InvoiceProduct) => <span className="text-sm">{p.iva_percent || 21}%</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (p: InvoiceProduct) => <span className="font-semibold">{formatCurrency(Number(p.total))}</span>,
    },
  ];

  const quoteColumns = [
    {
      key: "quote_number",
      label: "Nº Presupuesto",
      render: (p: QuoteProduct) => (
        <span className="font-mono text-xs">PP-{String(p.quote_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "quote_date",
      label: "Fecha",
      render: (p: QuoteProduct) => <span className="text-sm">{formatDate(p.quote_date)}</span>,
    },
    {
      key: "quote_status",
      label: "Estado",
      render: (p: QuoteProduct) => (
        <StatusBadge variant={quoteStatusMap[p.quote_status || "draft"]}>
          {p.quote_status === "approved" ? "Aprobado" : p.quote_status === "sent" ? "Enviado" : p.quote_status}
        </StatusBadge>
      ),
    },
    {
      key: "client_name",
      label: "Cliente",
      render: (p: QuoteProduct) => <span className="font-medium">{p.client_name || "-"}</span>,
    },
    {
      key: "contact_name",
      label: "Contacto",
      render: (p: QuoteProduct) => <span className="text-sm">{p.contact_name || "-"}</span>,
    },
    {
      key: "service_name",
      label: "Producto",
      render: (p: QuoteProduct) => (
        <div>
          <p className="font-medium">{p.service_name}</p>
          {p.service_category && <p className="text-xs text-muted-foreground">{p.service_category}</p>}
        </div>
      ),
    },
    {
      key: "service_category",
      label: "Categoría",
      render: (p: QuoteProduct) => <span className="text-sm">{p.service_category || "-"}</span>,
    },
    {
      key: "quantity",
      label: "Cant.",
      render: (p: QuoteProduct) => <span>{p.quantity}</span>,
    },
    {
      key: "unit_price",
      label: "P. Unit.",
      render: (p: QuoteProduct) => <span className="text-sm">{formatCurrency(Number(p.unit_price))}</span>,
    },
    {
      key: "discount_percent",
      label: "% Dto.",
      render: (p: QuoteProduct) => <span className="text-sm">{p.discount_percent || 0}%</span>,
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (p: QuoteProduct) => <span className="text-sm">{formatCurrency(Number(p.subtotal))}</span>,
    },
    {
      key: "iva_percent",
      label: "% IVA",
      render: (p: QuoteProduct) => <span className="text-sm">{p.iva_percent || 21}%</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (p: QuoteProduct) => <span className="font-semibold">{formatCurrency(Number(p.total))}</span>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Análisis de Productos"
        subtitle="Ventas y presupuestos por producto/servicio"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-success" />
              <p className="text-sm text-muted-foreground">Facturado Total</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-success">
              {invoiceStats ? formatCurrency(invoiceStats.totalInvoiced) : <Skeleton className="h-8 w-24" />}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Presupuestado</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {quoteStats ? formatCurrency(quoteStats.totalQuoted) : <Skeleton className="h-8 w-24" />}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-warning" />
              <p className="text-sm text-muted-foreground">Productos Únicos</p>
            </div>
            <p className="text-2xl font-semibold mt-1">
              {invoiceStats?.uniqueProducts || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-success">
              {quoteStats ? formatCurrency(quoteStats.approvedTotal) : <Skeleton className="h-8 w-24" />}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList>
              <TabsTrigger value="invoices" className="gap-2">
                <Receipt className="h-4 w-4" />
                Productos Facturados
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-2">
                <FileText className="h-4 w-4" />
                Productos Presupuestados
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Input
                placeholder="Buscar productos..."
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              {activeTab === "invoices" ? (
                <>
                  <TableViewManager
                    entityName="invoice_products"
                    columns={invoiceColumnConfigs}
                    visibleColumns={invoiceVisibleColumns}
                    onVisibleColumnsChange={setInvoiceVisibleColumns}
                    filters={{}}
                  />
                  <ExportDropdown
                    data={filteredInvoiceProducts}
                    columns={invoiceColumns.map((c) => ({ key: c.key, label: c.label }))}
                    filename="productos-facturados"
                  />
                </>
              ) : (
                <>
                  <TableViewManager
                    entityName="quote_products"
                    columns={quoteColumnConfigs}
                    visibleColumns={quoteVisibleColumns}
                    onVisibleColumnsChange={setQuoteVisibleColumns}
                    filters={{}}
                  />
                  <ExportDropdown
                    data={filteredQuoteProducts}
                    columns={quoteColumns.map((c) => ({ key: c.key, label: c.label }))}
                    filename="productos-presupuestados"
                  />
                </>
              )}
            </div>
          </div>

          <TabsContent value="invoices" className="mt-6">
            {loadingInvoices ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={invoiceColumns}
                data={filteredInvoiceProducts}
                visibleColumns={invoiceVisibleColumns}
              />
            )}
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            {loadingQuotes ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={quoteColumns}
                data={filteredQuoteProducts}
                visibleColumns={quoteVisibleColumns}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
