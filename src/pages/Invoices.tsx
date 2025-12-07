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
import { Plus, Filter, Download, FileText, Edit, Trash2, Printer } from "lucide-react";
import { useInvoices, useDeleteInvoice, useInvoice, InvoiceWithDetails } from "@/hooks/useInvoices";
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
import { useDefaultTemplate } from "@/hooks/useTemplates";
import { printDocument, formatInvoiceData } from "@/lib/pdfGenerator";
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

export default function Invoices() {
  const { data: invoices = [], isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();
  const { data: invoiceTemplate } = useDefaultTemplate("invoice");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [invoiceForPrint, setInvoiceForPrint] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    const data = formatInvoiceData(fullInvoice as unknown as Record<string, unknown>);
    printDocument({
      template: invoiceTemplate.content,
      data,
      filename: `factura-${fullInvoice.invoice_number}.html`,
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
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
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
          <DataTable columns={columns} data={filteredInvoices} />
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
    </div>
  );
}
