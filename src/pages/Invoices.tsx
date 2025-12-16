import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
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
import { Plus, Filter, FileText, Edit, Trash2, Printer, Mail } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDefaultTemplate } from "@/hooks/useTemplates";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { printDocument, formatInvoiceData, generatePrintableHTML } from "@/lib/pdfGenerator";
import { SendEmailDialog } from "@/components/common/SendEmailDialog";
import { toast } from "sonner";

const statusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  draft: "inactive",
  issued: "pending",
  paid: "active",
  cancelled: "danger",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida",
  paid: "Cobrada",
  cancelled: "Cancelada",
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
  const { data: invoiceTemplate } = useDefaultTemplate("invoice");
  const { data: companySettings } = useCompanySettings();
  const { data: defaultView } = useDefaultTableView("invoices");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [invoiceForPrint, setInvoiceForPrint] = useState<string | null>(null);
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

  // Fetch full invoice for email - this triggers when emailInvoiceId is set
  const { data: emailFullInvoice, isLoading: isLoadingEmailInvoice } = useInvoice(emailInvoiceId || undefined);

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  // Fetch full invoice for printing
  const { data: fullInvoice } = useInvoice(invoiceForPrint || undefined);

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

  const handlePrint = async (invoiceId: string) => {
    setInvoiceForPrint(invoiceId);
  };

  // Effect to print when full invoice is loaded
  if (fullInvoice && invoiceForPrint && invoiceTemplate) {
    const data = formatInvoiceData(
      fullInvoice as unknown as Record<string, unknown>,
      companySettings as unknown as Record<string, unknown>
    );
    printDocument({
      template: invoiceTemplate.content,
      data,
      filename: `factura-${fullInvoice.invoice_number}.html`,
      logoUrl: companySettings?.logo_url || undefined,
    });
    setInvoiceForPrint(null);
  }

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
      key: "actions",
      label: "Acciones",
      render: (invoice: InvoiceWithDetails) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!invoiceTemplate) {
                toast.error("No hay plantilla de factura configurada");
                return;
              }
              handlePrint(invoice.id);
            }}
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!invoiceTemplate) {
                toast.error("No hay plantilla de factura configurada");
                return;
              }
              // Set the invoice ID to fetch full details
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
    .filter((i) => i.status === "issued")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalCobrado = invoices
    .filter((i) => i.status === "paid")
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
        <div className="flex flex-col sm:flex-row gap-4">
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
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="issued">Emitida</SelectItem>
              <SelectItem value="paid">Cobrada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
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
          <DataTable columns={columns} data={filteredInvoices} visibleColumns={visibleColumns} />
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
          pdfHtml={invoiceTemplate ? generatePrintableHTML({
            template: invoiceTemplate.content,
            data: formatInvoiceData(
              emailFullInvoice as unknown as Record<string, unknown>,
              companySettings as unknown as Record<string, unknown>
            ),
            logoUrl: companySettings?.logo_url || undefined,
          }) : undefined}
          onSendSuccess={() => {
            // Mark invoice as sent for automation tracking
            markAsSent.mutate(emailFullInvoice.id);
          }}
        />
      )}
      
      {/* Loading state for email dialog */}
      {emailDialogOpen && (!emailFullInvoice || isLoadingEmailInvoice) && (
        <Dialog open={emailDialogOpen} onOpenChange={(open) => {
          setEmailDialogOpen(open);
          if (!open) setEmailInvoiceId(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Preparando envío...
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 flex flex-col items-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Cargando datos de la factura...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
