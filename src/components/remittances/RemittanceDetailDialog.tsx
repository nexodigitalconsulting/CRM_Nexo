"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileCode,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Send,
  Ban,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  useRemittance,
  useUpdateRemittance,
  useAddInvoicesToRemittance,
  useRemoveInvoicesFromRemittance,
  useMarkRemittanceAsSent,
  useCancelRemittance,
  useAvailableInvoicesForRemittance,
  RemittanceWithDetails,
} from "@/hooks/useRemittances";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { RegisterPaymentDialog } from "./RegisterPaymentDialog";
import { createSepaXmlFromRemittance, downloadSepaXml, SepaCreditor } from "@/lib/sepa/sepaXmlGenerator";
import { exportToExcel, ExportColumn } from "@/lib/exportUtils";
import { toast } from "sonner";

interface RemittanceDetailDialogProps {
  remittanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  enviada: "Enviada al banco",
  vencida: "Vencida",
  anulada: "Anulada",
  devuelta: "Devuelta",
};

const formatCurrency = (amount: number | null) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount || 0);

export function RemittanceDetailDialog({
  remittanceId,
  open,
  onOpenChange,
}: RemittanceDetailDialogProps) {
  const { data: remittance, isLoading } = useRemittance(remittanceId || undefined);
  const { data: availableInvoices } = useAvailableInvoicesForRemittance(remittanceId || undefined);
  const { data: companySettings } = useCompanySettings();
  const updateRemittance = useUpdateRemittance();
  const addInvoices = useAddInvoicesToRemittance();
  const removeInvoices = useRemoveInvoicesFromRemittance();
  const markAsSent = useMarkRemittanceAsSent();
  const cancelRemittance = useCancelRemittance();

  const [activeTab, setActiveTab] = useState("general");
  const [editedCode, setEditedCode] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [editedCollectionDate, setEditedCollectionDate] = useState("");
  const [selectedInvoicesToRemove, setSelectedInvoicesToRemove] = useState<string[]>([]);
  const [selectedInvoicesToAdd, setSelectedInvoicesToAdd] = useState<string[]>([]);
  const [showAddInvoicesDialog, setShowAddInvoicesDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Initialize form when remittance loads
  const initializeForm = () => {
    if (remittance) {
      setEditedCode(remittance.code || "");
      setEditedNotes(remittance.notes || "");
      setEditedCollectionDate(remittance.collection_date || "");
    }
  };

  // Check if remittance is editable
  const isEditable = remittance?.status === "pendiente";
  const canRegisterPayments = remittance?.status === "enviada" || remittance?.status === "parcial";
  const canDownloadXml = remittance?.status !== "anulada";

  const handleSaveGeneral = async () => {
    if (!remittanceId) return;
    await updateRemittance.mutateAsync({
      id: remittanceId,
      remittance: {
        code: editedCode || null,
        notes: editedNotes || null,
        collection_date: editedCollectionDate || null,
      },
    });
  };

  const handleRemoveInvoices = async () => {
    if (!remittanceId || selectedInvoicesToRemove.length === 0) return;
    await removeInvoices.mutateAsync({
      remittanceId,
      invoiceIds: selectedInvoicesToRemove,
    });
    setSelectedInvoicesToRemove([]);
  };

  const handleAddInvoices = async () => {
    if (!remittanceId || selectedInvoicesToAdd.length === 0) return;
    await addInvoices.mutateAsync({
      remittanceId,
      invoiceIds: selectedInvoicesToAdd,
    });
    setSelectedInvoicesToAdd([]);
    setShowAddInvoicesDialog(false);
  };

  const handleMarkAsSent = async () => {
    if (!remittanceId) return;
    await markAsSent.mutateAsync(remittanceId);
  };

  const handleCancel = async () => {
    if (!remittanceId) return;
    await cancelRemittance.mutateAsync({
      id: remittanceId,
      reason: cancelReason || undefined,
    });
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const handleDownloadXml = () => {
    if (!remittance || !companySettings) {
      toast.error("Faltan datos de la empresa para generar el XML");
      return;
    }

    const settings = companySettings as any;
    if (!settings.sepa_creditor_id) {
      toast.error("Configure el Identificador de Acreedor SEPA en Ajustes > Empresa");
      return;
    }

    if (!companySettings.iban) {
      toast.error("Configure el IBAN de la empresa en Ajustes > Empresa");
      return;
    }

    const creditor: SepaCreditor = {
      name: companySettings.name,
      iban: companySettings.iban,
      bic: settings.bic || undefined,
      creditorId: settings.sepa_creditor_id,
      address: companySettings.address || undefined,
      city: companySettings.city || undefined,
      postalCode: companySettings.postal_code || undefined,
      country: companySettings.country || "ES",
    };

    // Filter invoices without SEPA data
    const validInvoices = remittance.invoices?.filter(
      (inv) => inv.client?.iban && inv.client?.sepa_mandate_id
    );

    if (!validInvoices || validInvoices.length === 0) {
      toast.error("No hay facturas con datos SEPA válidos (IBAN y mandato)");
      return;
    }

    const invalidCount = (remittance.invoices?.length || 0) - validInvoices.length;
    if (invalidCount > 0) {
      toast.warning(`${invalidCount} factura(s) excluidas por falta de datos SEPA`);
    }

    try {
      const xml = createSepaXmlFromRemittance(remittance, creditor, validInvoices);
      const filename = `SEPA_${remittance.code || `REM${String(remittance.remittance_number).padStart(4, "0")}`}_${format(new Date(), "yyyyMMdd")}`;
      downloadSepaXml(xml, filename);
      toast.success("XML SEPA descargado correctamente");
    } catch (error) {
      console.error("Error generating SEPA XML:", error);
      toast.error("Error al generar el fichero XML");
    }
  };

  const handleExportExcel = () => {
    if (!remittance?.invoices) return;

    const columns: ExportColumn<any>[] = [
      { key: "invoice_number", label: "Nº Factura", format: (v: number) => `FF-${String(v).padStart(4, "0")}` },
      { key: "client.name", label: "Cliente" },
      { key: "client.iban", label: "IBAN" },
      { key: "total", label: "Importe", format: (v: number) => v?.toFixed(2) || "0.00" },
      { key: "due_date", label: "Vencimiento", format: (v: string) => v ? format(new Date(v), "dd/MM/yyyy") : "" },
      { key: "status", label: "Estado" },
    ];

    exportToExcel(
      remittance.invoices,
      columns,
      `Remesa_${remittance.code || remittance.remittance_number}`,
      "Facturas"
    );
    toast.success("Excel exportado");
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl">
                    {remittance?.code || `RM-${String(remittance?.remittance_number || 0).padStart(4, "0")}`}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {remittance?.issue_date
                      ? format(new Date(remittance.issue_date), "dd MMM yyyy", { locale: es })
                      : ""}
                  </p>
                </div>
              </div>
              {remittance && (
                <StatusBadge variant={statusMap[remittance.status || "pendiente"]}>
                  {statusLabels[remittance.status || "pendiente"]}
                </StatusBadge>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : remittance ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3 py-3 border-b">
                <div className="text-center">
                  <p className="text-2xl font-bold">{remittance.invoice_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Facturas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(Number(remittance.total_amount || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(Number(remittance.paid_amount || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Cobrado</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(
                      Number(remittance.total_amount || 0) - Number(remittance.paid_amount || 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                </div>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v);
                  if (v === "general") initializeForm();
                }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Datos Generales</TabsTrigger>
                  <TabsTrigger value="invoices">
                    Facturas ({remittance.invoices?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    Pagos ({remittance.payments?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* General Tab */}
                  <TabsContent value="general" className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Código de Remesa</Label>
                        <Input
                          value={editedCode}
                          onChange={(e) => setEditedCode(e.target.value)}
                          disabled={!isEditable}
                          placeholder={`REM-${String(remittance.remittance_number).padStart(4, "0")}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de Cobro Solicitada</Label>
                        <Input
                          type="date"
                          value={editedCollectionDate}
                          onChange={(e) => setEditedCollectionDate(e.target.value)}
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        disabled={!isEditable}
                        rows={3}
                      />
                    </div>

                    {isEditable && (
                      <Button
                        onClick={handleSaveGeneral}
                        disabled={updateRemittance.isPending}
                      >
                        {updateRemittance.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar Cambios
                      </Button>
                    )}

                    <div className="border-t pt-4 mt-6">
                      <h3 className="font-medium mb-3">Acciones</h3>
                      <div className="flex flex-wrap gap-2">
                        {canDownloadXml && (
                          <>
                            <Button variant="outline" onClick={handleDownloadXml}>
                              <FileCode className="h-4 w-4 mr-2" />
                              Descargar XML SEPA
                            </Button>
                            <Button variant="outline" onClick={handleExportExcel}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Exportar Excel
                            </Button>
                          </>
                        )}
                        {isEditable && (
                          <Button
                            variant="default"
                            onClick={handleMarkAsSent}
                            disabled={markAsSent.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Marcar como Enviada al Banco
                          </Button>
                        )}
                        {canRegisterPayments && (
                          <Button
                            variant="default"
                            onClick={() => setShowPaymentDialog(true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Registrar Pagos/Devoluciones
                          </Button>
                        )}
                        {(isEditable || canRegisterPayments) && (
                          <Button
                            variant="destructive"
                            onClick={() => setShowCancelDialog(true)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Anular Remesa
                          </Button>
                        )}
                      </div>
                    </div>

                    {remittance.sent_to_bank_at && (
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <p>
                          <strong>Enviada al banco:</strong>{" "}
                          {format(new Date(remittance.sent_to_bank_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    )}

                    {remittance.cancelled_at && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                        <p>
                          <strong>Anulada:</strong>{" "}
                          {format(new Date(remittance.cancelled_at), "dd/MM/yyyy HH:mm")}
                        </p>
                        {remittance.cancelled_reason && (
                          <p className="mt-1">
                            <strong>Motivo:</strong> {remittance.cancelled_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Invoices Tab */}
                  <TabsContent value="invoices" className="p-4 space-y-4">
                    {isEditable && (
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddInvoicesDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir Facturas
                        </Button>
                        {selectedInvoicesToRemove.length > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveInvoices}
                            disabled={removeInvoices.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Quitar {selectedInvoicesToRemove.length} seleccionada(s)
                          </Button>
                        )}
                      </div>
                    )}

                    {remittance.invoices && remittance.invoices.length > 0 ? (
                      <div className="space-y-2">
                        {remittance.invoices.map((invoice) => {
                          const hasSepaData = invoice.client?.iban && invoice.client?.sepa_mandate_id;
                          return (
                            <div
                              key={invoice.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                selectedInvoicesToRemove.includes(invoice.id)
                                  ? "border-destructive bg-destructive/5"
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isEditable && (
                                  <Checkbox
                                    checked={selectedInvoicesToRemove.includes(invoice.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedInvoicesToRemove((prev) =>
                                        checked
                                          ? [...prev, invoice.id]
                                          : prev.filter((id) => id !== invoice.id)
                                      );
                                    }}
                                  />
                                )}
                                <div>
                                  <p className="font-mono text-sm font-medium">
                                    FF-{String(invoice.invoice_number).padStart(4, "0")}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {invoice.client?.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {!hasSepaData && (
                                  <div className="flex items-center gap-1 text-warning text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    Sin datos SEPA
                                  </div>
                                )}
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {formatCurrency(Number(invoice.total || 0))}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Vence:{" "}
                                    {invoice.due_date
                                      ? format(new Date(invoice.due_date), "dd/MM/yyyy")
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay facturas en esta remesa
                      </div>
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="p-4 space-y-4">
                    {canRegisterPayments && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowPaymentDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Pago/Devolución
                      </Button>
                    )}

                    {remittance.payments && remittance.payments.length > 0 ? (
                      <div className="space-y-2">
                        {remittance.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              {payment.status === "cobrado" ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                              )}
                              <div>
                                <p className="font-mono text-sm font-medium">
                                  FF-{String(payment.invoice?.invoice_number || 0).padStart(4, "0")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {(payment.invoice as any)?.client?.name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-semibold ${
                                  payment.status === "cobrado" ? "text-success" : "text-destructive"
                                }`}
                              >
                                {payment.status === "cobrado" ? "+" : "-"}
                                {formatCurrency(Number(payment.amount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.payment_date), "dd/MM/yyyy")} •{" "}
                                {payment.status === "cobrado"
                                  ? "Cobrado"
                                  : payment.status === "devuelto"
                                  ? "Devuelto"
                                  : "Rechazado"}
                              </p>
                              {payment.return_reason && (
                                <p className="text-xs text-destructive mt-1">
                                  {payment.return_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay pagos registrados
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Remesa no encontrada
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Invoices Dialog */}
      <Dialog open={showAddInvoicesDialog} onOpenChange={setShowAddInvoicesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Facturas a la Remesa</DialogTitle>
          </DialogHeader>
          {availableInvoices && availableInvoices.length > 0 ? (
            <>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {availableInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedInvoicesToAdd.includes(invoice.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        setSelectedInvoicesToAdd((prev) =>
                          prev.includes(invoice.id)
                            ? prev.filter((id) => id !== invoice.id)
                            : [...prev, invoice.id]
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedInvoicesToAdd.includes(invoice.id)} />
                        <div>
                          <p className="font-mono text-sm">
                            FF-{String(invoice.invoice_number).padStart(4, "0")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client?.name}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(Number(invoice.total || 0))}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddInvoicesDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddInvoices}
                  disabled={selectedInvoicesToAdd.length === 0 || addInvoices.isPending}
                >
                  {addInvoices.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Añadir {selectedInvoicesToAdd.length} factura(s)
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay facturas disponibles para añadir
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta remesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción liberará todas las facturas asociadas y no se podrá deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Motivo de anulación (opcional)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Cambio de condiciones, error en datos..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anular Remesa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Registration Dialog */}
      {showPaymentDialog && remittance && (
        <RegisterPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          remittance={remittance}
        />
      )}
    </>
  );
}
