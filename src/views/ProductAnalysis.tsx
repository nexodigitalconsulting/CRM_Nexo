"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, FileText, Receipt, TrendingUp, Package, FileCheck } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import {
  useInvoiceProducts,
  useQuoteProducts,
  useContractProducts,
  useProductStats,
  InvoiceProduct,
  QuoteProduct,
  ContractProduct,
} from "@/hooks/useProductAnalysis";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-ES");

const invoiceStatusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  borrador: "inactive",
  emitida: "pending",
  pagada: "active",
  cancelada: "danger",
};

const quoteStatusMap: Record<string, "inactive" | "new" | "active" | "danger"> = {
  borrador: "inactive",
  enviado: "new",
  aceptado: "active",
  rechazado: "danger",
};

const contractStatusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  vigente: "active",
  pendiente_activacion: "pending",
  expirado: "inactive",
  cancelado: "danger",
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

const contractColumnConfigs: ColumnConfig[] = [
  { key: "contract_number", label: "Nº Contrato", defaultVisible: true },
  { key: "contract_name", label: "Nombre", defaultVisible: true },
  { key: "contract_status", label: "Estado", defaultVisible: true },
  { key: "client_name", label: "Cliente", defaultVisible: true },
  { key: "service_name", label: "Producto/Servicio", defaultVisible: true },
  { key: "service_category", label: "Categoría", defaultVisible: true },
  { key: "quantity", label: "Cantidad", defaultVisible: true },
  { key: "unit_price", label: "Precio Unitario", defaultVisible: true },
  { key: "billing_period", label: "Periodicidad", defaultVisible: true },
  { key: "discount_percent", label: "% Descuento", defaultVisible: false },
  { key: "subtotal", label: "Subtotal", defaultVisible: true },
  { key: "total", label: "Total", defaultVisible: true },
];

export default function ProductAnalysis() {
  const { data: invoiceProducts = [], isLoading: loadingInvoices } = useInvoiceProducts();
  const { data: quoteProducts = [], isLoading: loadingQuotes } = useQuoteProducts();
  const { data: contractProducts = [], isLoading: loadingContracts } = useContractProducts();
  const { invoiceStats, quoteStats, contractStats } = useProductStats();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("invoices");

  // Table views
  const { data: defaultInvoiceView } = useDefaultTableView("invoice_products");
  const { data: defaultQuoteView } = useDefaultTableView("quote_products");
  const { data: defaultContractView } = useDefaultTableView("contract_products");

  const [invoiceVisibleColumns, setInvoiceVisibleColumns] = useState<string[]>(
    invoiceColumnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [quoteVisibleColumns, setQuoteVisibleColumns] = useState<string[]>(
    quoteColumnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [contractVisibleColumns, setContractVisibleColumns] = useState<string[]>(
    contractColumnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
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
  if (defaultContractView && contractVisibleColumns.length === contractColumnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultContractView.visible_columns as string[];
    if (cols.length > 0) setContractVisibleColumns(cols);
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

  const filteredContractProducts = contractProducts.filter((p) =>
    p.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contract_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.service_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const billingPeriodLabels: Record<string, string> = {
    mensual: "Mensual",
    trimestral: "Trimestral",
    anual: "Anual",
    unico: "Único",
    otro: "Otro",
  };

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
        <StatusBadge variant={invoiceStatusMap[p.invoice_status || "borrador"]}>
          {p.invoice_status === "pagada" ? "Cobrada" : p.invoice_status === "emitida" ? "Emitida" : p.invoice_status === "borrador" ? "Borrador" : p.invoice_status === "cancelada" ? "Cancelada" : p.invoice_status || "Borrador"}
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
        <StatusBadge variant={quoteStatusMap[p.quote_status || "borrador"]}>
          {p.quote_status === "aceptado" ? "Aceptado" : p.quote_status === "enviado" ? "Enviado" : p.quote_status === "borrador" ? "Borrador" : p.quote_status === "rechazado" ? "Rechazado" : p.quote_status || "Borrador"}
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

  const contractColumns = [
    {
      key: "contract_number",
      label: "Nº Contrato",
      render: (p: ContractProduct) => (
        <span className="font-mono text-xs">CN-{String(p.contract_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "contract_name",
      label: "Nombre",
      render: (p: ContractProduct) => <span className="font-medium">{p.contract_name || "-"}</span>,
    },
    {
      key: "contract_status",
      label: "Estado",
      render: (p: ContractProduct) => (
        <StatusBadge variant={contractStatusMap[p.contract_status || "pendiente_activacion"]}>
          {p.contract_status === "vigente" ? "Vigente" : p.contract_status === "pendiente_activacion" ? "Pendiente" : p.contract_status === "expirado" ? "Expirado" : p.contract_status === "cancelado" ? "Cancelado" : p.contract_status || "Pendiente"}
        </StatusBadge>
      ),
    },
    {
      key: "client_name",
      label: "Cliente",
      render: (p: ContractProduct) => <span className="font-medium">{p.client_name}</span>,
    },
    {
      key: "service_name",
      label: "Producto",
      render: (p: ContractProduct) => (
        <div>
          <p className="font-medium">{p.service_name}</p>
          {p.service_category && <p className="text-xs text-muted-foreground">{p.service_category}</p>}
        </div>
      ),
    },
    {
      key: "service_category",
      label: "Categoría",
      render: (p: ContractProduct) => <span className="text-sm">{p.service_category || "-"}</span>,
    },
    {
      key: "quantity",
      label: "Cant.",
      render: (p: ContractProduct) => <span>{p.quantity}</span>,
    },
    {
      key: "unit_price",
      label: "P. Unit.",
      render: (p: ContractProduct) => <span className="text-sm">{formatCurrency(Number(p.unit_price))}</span>,
    },
    {
      key: "billing_period",
      label: "Periodicidad",
      render: (p: ContractProduct) => <span className="text-sm">{billingPeriodLabels[p.billing_period || ""] || p.billing_period || "-"}</span>,
    },
    {
      key: "discount_percent",
      label: "% Dto.",
      render: (p: ContractProduct) => <span className="text-sm">{p.discount_percent || 0}%</span>,
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (p: ContractProduct) => <span className="text-sm">{formatCurrency(Number(p.subtotal))}</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (p: ContractProduct) => <span className="font-semibold">{formatCurrency(Number(p.total))}</span>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Análisis de Productos"
        subtitle="Ventas, presupuestos y contratos por producto/servicio"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-success" />
              <p className="text-sm text-muted-foreground">Facturado (Base)</p>
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
              <FileCheck className="h-5 w-5 text-info" />
              <p className="text-sm text-muted-foreground">Contratado Activo</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-info">
              {contractStats ? formatCurrency(contractStats.totalContracted) : <Skeleton className="h-8 w-24" />}
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
                Facturados
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-2">
                <FileText className="h-4 w-4" />
                Presupuestados
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Contratados
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
              {activeTab === "invoices" && (
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
                    tableName="invoice_products"
                  />
                </>
              )}
              {activeTab === "quotes" && (
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
                    tableName="quote_products"
                  />
                </>
              )}
              {activeTab === "contracts" && (
                <>
                  <TableViewManager
                    entityName="contract_products"
                    columns={contractColumnConfigs}
                    visibleColumns={contractVisibleColumns}
                    onVisibleColumnsChange={setContractVisibleColumns}
                    filters={{}}
                  />
                  <ExportDropdown
                    data={filteredContractProducts}
                    columns={contractColumns.map((c) => ({ key: c.key, label: c.label }))}
                    filename="productos-contratados"
                    tableName="contract_services"
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

          <TabsContent value="contracts" className="mt-6">
            {loadingContracts ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={contractColumns}
                data={filteredContractProducts}
                visibleColumns={contractVisibleColumns}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
