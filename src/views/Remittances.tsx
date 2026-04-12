"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable, Column } from "@/components/ui/filterable-data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { entityExportConfigs } from "@/lib/exportUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  CreditCard,
  FileText,
  FileCode,
  Loader2,
  Trash2,
  Eye,
  Send,
  Ban,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  useRemittances,
  useCreateRemittance,
  useDeleteRemittance,
  useAvailableInvoicesForRemittance,
  Remittance,
} from "@/hooks/useRemittances";
import { RemittanceDetailDialog } from "@/components/remittances";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusMap: Record<string, "active" | "pending" | "danger" | "inactive"> = {
  cobrada: "active",
  pendiente: "pending",
  parcial: "pending",
  enviada: "pending",
  vencida: "danger",
  anulada: "inactive",
  devuelta: "danger",
};

const statusLabels: Record<string, string> = {
  cobrada: "Cobrada",
  pendiente: "Pendiente",
  parcial: "Parcial",
  enviada: "Enviada",
  vencida: "Vencida",
  anulada: "Anulada",
  devuelta: "Devuelta",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export default function Remittances() {
  const { data: remittances, isLoading } = useRemittances();
  const { data: availableInvoices } = useAvailableInvoicesForRemittance();
  const createRemittance = useCreateRemittance();
  const deleteRemittance = useDeleteRemittance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [remittanceToDelete, setRemittanceToDelete] = useState<Remittance | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  
  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRemittanceId, setSelectedRemittanceId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (selectedInvoices.length === 0) return;

    const selectedInvoiceData = availableInvoices?.filter((inv) =>
      selectedInvoices.includes(inv.id)
    ) || [];

    const totalAmount = selectedInvoiceData.reduce(
      (sum, inv) => sum + Number(inv.total || 0),
      0
    );

    await createRemittance.mutateAsync({
      remittance: {
        code: code || `REM-${format(new Date(), "MMM-yyyy", { locale: es }).toUpperCase()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        issue_date: format(new Date(), "yyyy-MM-dd"),
        collection_date: collectionDate || null,
        invoice_count: selectedInvoices.length,
        total_amount: totalAmount,
        status: "pendiente",
      },
      invoiceIds: selectedInvoices,
    });

    setDialogOpen(false);
    setSelectedInvoices([]);
    setCode("");
    setCollectionDate("");
  };

  const handleDelete = (remittance: Remittance) => {
    setRemittanceToDelete(remittance);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (remittanceToDelete) {
      await deleteRemittance.mutateAsync(remittanceToDelete.id);
      setDeleteDialogOpen(false);
      setRemittanceToDelete(null);
    }
  };

  const handleOpenDetail = (remittance: Remittance) => {
    setSelectedRemittanceId(remittance.id);
    setDetailDialogOpen(true);
  };

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const remittancesList = remittances || [];

  // Calculate totals by status
  const totalPending = remittancesList
    .filter((r) => r.status === "pendiente" || r.status === "parcial" || r.status === "enviada")
    .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  const totalPaid = remittancesList
    .filter((r) => r.status === "cobrada")
    .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  const totalReturned = remittancesList
    .filter((r) => r.status === "devuelta" || r.status === "vencida")
    .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  const columns: Column<Remittance>[] = [
    {
      key: "code",
      label: "Código Remesa",
      sortable: true,
      render: (remittance: Remittance) => (
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-primary"
          onClick={() => handleOpenDetail(remittance)}
        >
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">
            {remittance.code || `RM-${String(remittance.remittance_number).padStart(4, "0")}`}
          </span>
        </div>
      ),
    },
    {
      key: "issue_date",
      label: "Emisión",
      sortable: true,
      render: (remittance: Remittance) => (
        <span className="text-sm">
          {format(new Date(remittance.issue_date), "dd/MM/yyyy")}
        </span>
      ),
    },
    {
      key: "collection_date",
      label: "Cobro Solicitado",
      sortable: true,
      render: (remittance: Remittance) => (
        <span className="text-sm">
          {remittance.collection_date
            ? format(new Date(remittance.collection_date), "dd/MM/yyyy")
            : "—"}
        </span>
      ),
    },
    {
      key: "invoice_count",
      label: "Facturas",
      sortable: true,
      render: (remittance: Remittance) => (
        <span className="text-sm">{remittance.invoice_count || 0}</span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      sortable: true,
      render: (remittance: Remittance) => (
        <span className="font-semibold">
          {formatCurrency(Number(remittance.total_amount || 0))}
        </span>
      ),
    },
    {
      key: "paid_amount",
      label: "Cobrado",
      sortable: true,
      render: (remittance: Remittance) => (
        <span className="text-success font-medium">
          {formatCurrency(Number(remittance.paid_amount || 0))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      filterable: true,
      render: (remittance: Remittance) => (
        <StatusBadge variant={statusMap[remittance.status || "pendiente"]}>
          {statusLabels[remittance.status || "pendiente"]}
        </StatusBadge>
      ),
    },
    {
      key: "files",
      label: "Ficheros",
      filterable: false,
      render: (remittance: Remittance) => (
        <div className="flex gap-1">
          {remittance.xml_file_url && (
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
              <FileCode className="h-3 w-3" />
              XML
            </Button>
          )}
          {remittance.n19_file_url && (
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
              <FileText className="h-3 w-3" />
              N19
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      filterable: false,
      render: (remittance: Remittance) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetail(remittance);
            }}
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {remittance.status === "pendiente" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(remittance);
              }}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Status icons for summary
  const statusIcons = {
    pending: <Send className="h-4 w-4" />,
    paid: <CheckCircle2 className="h-4 w-4" />,
    returned: <Ban className="h-4 w-4" />,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Remesas de Cobro"
        subtitle="Gestión de domiciliaciones bancarias SEPA"
        actions={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva Remesa
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Remesas</p>
            <p className="text-2xl font-semibold mt-1">{remittancesList.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {statusIcons.pending}
              <p className="text-sm">Pendiente de Cobro</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {statusIcons.paid}
              <p className="text-sm">Cobrado</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-success">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {statusIcons.returned}
              <p className="text-sm">Devuelto/Vencido</p>
            </div>
            <p className="text-2xl font-semibold mt-1 text-destructive">
              {formatCurrency(totalReturned)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Facturas disponibles</p>
            <p className="text-2xl font-semibold mt-1">{availableInvoices?.length || 0}</p>
          </div>
        </div>

        {/* SEPA Format Info */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h3 className="font-medium mb-2">Formatos de exportación disponibles</h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <span><strong>XML SEPA</strong> - ISO 20022 pain.008 (estándar europeo)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span><strong>Norma 19</strong> - Formato tradicional español</span>
            </div>
          </div>
        </div>

        {/* Table with Filters */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <ExportDropdown
                data={remittancesList}
                columns={entityExportConfigs.remittances.columns as any}
                filename={entityExportConfigs.remittances.filename}
              />
            </div>
            <FilterableDataTable
              columns={columns}
              data={remittancesList}
              onRowClick={handleOpenDetail}
            />
          </div>
        )}
      </div>

      {/* Create Remittance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Remesa de Cobro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código de Remesa (opcional)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`REM-${format(new Date(), "MMM-yyyy", { locale: es }).toUpperCase()}-001`}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Cobro Solicitada</Label>
                <Input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Seleccionar Facturas</Label>
              {availableInvoices && availableInvoices.length > 0 ? (
                <ScrollArea className="h-64 border rounded-lg p-2">
                  <div className="space-y-2">
                    {availableInvoices.map((invoice) => {
                      const hasSepaData = invoice.client?.iban && invoice.client?.sepa_mandate_id;
                      return (
                        <div
                          key={invoice.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedInvoices.includes(invoice.id)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => toggleInvoice(invoice.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={() => toggleInvoice(invoice.id)}
                            />
                            <div>
                              <p className="font-mono text-sm">
                                FF-{String(invoice.invoice_number).padStart(4, "0")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {invoice.client?.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(Number(invoice.total || 0))}</p>
                            <div className="flex items-center gap-2 justify-end">
                              {!hasSepaData && (
                                <span className="text-xs text-warning">Sin SEPA</span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Vence: {invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No hay facturas disponibles para incluir en remesa
                </div>
              )}
            </div>

            {selectedInvoices.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facturas seleccionadas:</span>
                  <span className="font-medium">{selectedInvoices.length}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(
                      availableInvoices
                        ?.filter((inv) => selectedInvoices.includes(inv.id))
                        .reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedInvoices.length === 0 || createRemittance.isPending}
            >
              {createRemittance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Remesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar remesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la remesa y las facturas volverán a estar disponibles para nuevas remesas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remittance Detail Dialog */}
      <RemittanceDetailDialog
        remittanceId={selectedRemittanceId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
