"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable } from "@/components/ui/filterable-data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, FileText, Edit, Trash2, Mail, Download, Send, Loader2 } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useInvoices, useDeleteInvoice, useInvoice, useMarkInvoiceAsSent, InvoiceWithDetails } from "@/hooks/useInvoices";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useDefaultTemplate, extractPdfConfigFromTemplate } from "@/hooks/useDefaultTemplate";
import { downloadInvoicePdf } from "@/lib/pdf/invoicePdf";
import { SendEmailDialog } from "@/components/common/SendEmailDialog";
import { toast } from "sonner";
import { fetchInvoice } from "@/lib/api/invoices";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  borrador: "inactive",
  emitida: "pending",
  pagada: "active",
  cancelada: "danger",
};

const statusLabels: Record<string, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada: "Cobrada",
  cancelada: "Cancelada",
};

const formatCurrency = (amount: number | null) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0);
};

const columnConfigs: ColumnConfig[] = [
  { key: "invoice_number", label: "Nº Factura", defaultVisible: true },
  { key: "client", label: "Cliente", defaultVisible: true },
  { key: "issue_date", label: "Fecha Emisión", defaultVisible: true },
  { key: "due_date", label: "Vencimiento", defaultVisible: true },
  { key: "subtotal", label: "Base Imponible", defaultVisible: true },
  { key: "iva_amount", label: "IVA", defaultVisible: false },
  { key: "irpf_amount", label: "IRPF", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "contract", label: "Contrato", defaultVisible: false },
  { key: "remittance", label: "Remesa", defaultVisible: false },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Invoices() {
  const { data: invoices = [], isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();
  const markAsSent = useMarkInvoiceAsSent();
  const { data: companySettings } = useCompanySettings();
  const { data: defaultTemplate } = useDefaultTemplate('invoice');
  const { data: defaultView } = useDefaultTableView("invoices");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInvoiceId, setEmailInvoiceId] = useState<string | null>(null);
  
  // Download state
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Fetch full invoice for email - this triggers when emailInvoiceId is set
  const { data: emailFullInvoice, isLoading: isLoadingEmailInvoice } = useInvoice(emailInvoiceId || undefined);
  
  // Function to fetch complete invoice with services for PDF generation
  const fetchInvoiceForPdf = useCallback(async (invoiceId: string) => {
    return fetchInvoice(invoiceId);
  }, []);

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesSearch = 
      invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(invoice.invoice_number).includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const handleEdit = (invoice: InvoiceWithDetails) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDelete = (invoice: InvoiceWithDetails) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice.mutate(invoiceToDelete.id);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingInvoice(null);
  };

  const columns = [
    {
      key: "invoice_number",
      label: "Nº Factura",
      render: (invoice: InvoiceWithDetails) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium text-foreground">
            FF-{String(invoice.invoice_number).padStart(4, "0")}
          </span>
        </div>
      ),
    },
    {
      key: "client",
      label: "Cliente",
      render: (invoice: InvoiceWithDetails) => (
        <div>
          <p className="font-medium text-foreground">{invoice.client?.name}</p>
          <p className="text-xs text-muted-foreground">{invoice.client?.cif}</p>
        </div>
      ),
    },
    {
      key: "issue_date",
      label: "Fecha Emisión",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm">
          {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: es })}
        </span>
      ),
    },
    {
      key: "due_date",
      label: "Vencimiento",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm">
          {invoice.due_date
            ? format(new Date(invoice.due_date), "dd MMM yyyy", { locale: es })
            : "-"}
        </span>
      ),
    },
    {
      key: "subtotal",
      label: "Base Imponible",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm">{formatCurrency(invoice.subtotal)}</span>
      ),
    },
    {
      key: "iva_amount",
      label: "IVA",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm">{formatCurrency(invoice.iva_amount)}</span>
      ),
    },
    {
      key: "irpf_amount",
      label: "IRPF",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm text-destructive">
          {invoice.irpf_amount && invoice.irpf_amount > 0 
            ? `-${formatCurrency(invoice.irpf_amount)}` 
            : "-"}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (invoice: InvoiceWithDetails) => (
        <span className="font-semibold text-foreground">
          {formatCurrency(invoice.total)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (invoice: InvoiceWithDetails) => (
        <StatusBadge variant={statusMap[invoice.status]}>
          {statusLabels[invoice.status]}
        </StatusBadge>
      ),
    },
    {
      key: "contract",
      label: "Contrato",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {invoice.contract_id ? "Sí" : "-"}
        </span>
      ),
    },
    {
      key: "remittance",
      label: "Remesa",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {invoice.remittance_id ? "Sí" : "-"}
        </span>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (invoice: InvoiceWithDetails) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
          {invoice.notes || "-"}
        </span>
      ),
    },
    {
      key: "is_sent",
      label: "Enviada",
      render: (invoice: InvoiceWithDetails) => (
        (invoice as any).is_sent ? (
          <Send className="h-4 w-4 text-primary" />
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (invoice: InvoiceWithDetails) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={downloadingInvoiceId === invoice.id}
            onClick={async () => {
              try {
                setDownloadingInvoiceId(invoice.id);
                
                // Fetch complete invoice with services
                const fullInvoice = await fetchInvoiceForPdf(invoice.id);
                
                // Prepare invoice data with services
                const invoiceData = {
                  invoice_number: fullInvoice.invoice_number,
                  issue_date: fullInvoice.issue_date,
                  due_date: fullInvoice.due_date,
                  subtotal: fullInvoice.subtotal,
                  iva_amount: fullInvoice.iva_amount,
                  iva_percent: fullInvoice.iva_percent,
                  irpf_percent: (fullInvoice as any).irpf_percent || 0,
                  irpf_amount: (fullInvoice as any).irpf_amount || 0,
                  total: fullInvoice.total,
                  notes: fullInvoice.notes,
                  client: fullInvoice.client,
                  services: fullInvoice.invoice_services,
                };
                
                // Extract config from default template
                const pdfConfig = extractPdfConfigFromTemplate(defaultTemplate);
                
                console.log('[PDF Download] Template:', defaultTemplate?.name);
                console.log('[PDF Download] Config:', pdfConfig);
                console.log('[PDF Download] Services count:', fullInvoice.invoice_services?.length || 0);
                
                await downloadInvoicePdf(invoiceData as any, companySettings as any, pdfConfig, defaultTemplate as any);
                toast.success("PDF descargado");
              } catch (error) {
                console.error('[PDF Download] Error:', error);
                toast.error("Error al descargar PDF");
              } finally {
                setDownloadingInvoiceId(null);
              }
            }}
            title="Descargar PDF"
          >
            {downloadingInvoiceId === invoice.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEmailInvoiceId(invoice.id);
              setEmailDialogOpen(true);
            }}
            title="Enviar por email"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(invoice)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(invoice)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const totalEmitidas = invoices
    .filter((i) => i.status === "emitida")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalCobrado = invoices
    .filter((i) => i.status === "pagada")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div className="animate-fade-in">
      <Header
        title="Facturas"
        subtitle="Gestión de facturación"
        actions={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Facturas</p>
            <p className="text-2xl font-semibold mt-1">
              {isLoading ? <Skeleton className="h-8 w-12" /> : invoices.length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes de Cobro</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {isLoading ? <Skeleton className="h-8 w-12" /> : formatCurrency(totalEmitidas)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Cobrado este mes</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {isLoading ? <Skeleton className="h-8 w-12" /> : formatCurrency(totalCobrado)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Media por factura</p>
            <p className="text-2xl font-semibold mt-1">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : invoices.length > 0 ? (
                formatCurrency(
                  invoices.reduce((sum, i) => sum + (i.total || 0), 0) / invoices.length
                )
              ) : (
                formatCurrency(0)
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input 
            placeholder="Buscar facturas..." 
            className="sm:w-80" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="pagada">Cobrada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Template indicator */}
          {defaultTemplate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md">
                    <FileText className="h-3 w-3" />
                    <span className="text-muted-foreground">Plantilla:</span>
                    <span className="font-medium">{defaultTemplate.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Plantilla PDF activa para descargas y envíos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <TableViewManager
              entityName="invoices"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{ status: statusFilter }}
            />
            <ExportDropdown
              data={filteredInvoices}
              columns={entityExportConfigs.invoices.columns as any}
              filename={entityExportConfigs.invoices.filename}
            />
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <FilterableDataTable 
            columns={columns} 
            data={invoices} 
            visibleColumns={visibleColumns} 
          />
        )}
      </div>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        invoice={editingInvoice}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la factura
              FF-{String(invoiceToDelete?.invoice_number).padStart(4, "0")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailDialogOpen && emailFullInvoice && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) {
              setEmailInvoiceId(null);
            }
          }}
          entityType="invoice"
          entityId={emailFullInvoice.id}
          entityNumber={emailFullInvoice.invoice_number}
          clientName={emailFullInvoice.client?.name || ""}
          clientEmail={emailFullInvoice.client?.email || ""}
          total={emailFullInvoice.total || 0}
          dueDate={emailFullInvoice.due_date || undefined}
          isLoadingDocument={isLoadingEmailInvoice}
          entityData={emailFullInvoice as unknown as Record<string, unknown>}
          onSendSuccess={() => {
            // Mark invoice as sent for automation tracking
            markAsSent.mutate(emailFullInvoice.id);
          }}
        />
      )}
    </div>
  );
}
