import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useRegisterRemittancePayment, RemittanceWithDetails } from "@/hooks/useRemittances";

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remittance: RemittanceWithDetails;
}

type PaymentStatus = "cobrado" | "devuelto" | "rechazado";

interface PaymentEntry {
  invoice_id: string;
  amount: number;
  payment_date: string;
  status: PaymentStatus;
  return_reason?: string;
}

const returnReasons = [
  "Sin fondos suficientes",
  "Cuenta cerrada",
  "IBAN incorrecto",
  "Mandato revocado",
  "Mandato caducado",
  "Operación no autorizada",
  "Otro motivo",
];

const formatCurrency = (amount: number | null) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount || 0);

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  remittance,
}: RegisterPaymentDialogProps) {
  const registerPayment = useRegisterRemittancePayment();

  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkStatus, setBulkStatus] = useState<PaymentStatus>("cobrado");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [customReasons, setCustomReasons] = useState<Record<string, string>>({});
  const [selectedReasons, setSelectedReasons] = useState<Record<string, string>>({});

  // Filter invoices that haven't been paid yet
  const unpaidInvoices = remittance.invoices?.filter((inv) => {
    const hasPaidPayment = remittance.payments?.some(
      (p) => p.invoice_id === inv.id && p.status === "cobrado"
    );
    return !hasPaidPayment;
  });

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const selectAll = () => {
    if (unpaidInvoices) {
      setSelectedInvoices(unpaidInvoices.map((inv) => inv.id));
    }
  };

  const deselectAll = () => {
    setSelectedInvoices([]);
  };

  const handleSubmit = async () => {
    if (selectedInvoices.length === 0) return;

    const payments: PaymentEntry[] = selectedInvoices.map((invoiceId) => {
      const invoice = unpaidInvoices?.find((inv) => inv.id === invoiceId);
      const reason = selectedReasons[invoiceId] === "Otro motivo" 
        ? customReasons[invoiceId] 
        : selectedReasons[invoiceId];
      
      return {
        invoice_id: invoiceId,
        amount: Number(invoice?.total || 0),
        payment_date: paymentDate,
        status: bulkStatus,
        return_reason: bulkStatus !== "cobrado" ? reason : undefined,
      };
    });

    await registerPayment.mutateAsync({
      remittanceId: remittance.id,
      payments,
    });

    onOpenChange(false);
    setSelectedInvoices([]);
    setCustomReasons({});
    setSelectedReasons({});
  };

  const totalSelected = selectedInvoices.reduce((sum, id) => {
    const invoice = unpaidInvoices?.find((inv) => inv.id === id);
    return sum + Number(invoice?.total || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Pagos/Devoluciones</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado del Pago</Label>
              <Select
                value={bulkStatus}
                onValueChange={(v) => setBulkStatus(v as PaymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobrado">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Cobrado
                    </div>
                  </SelectItem>
                  <SelectItem value="devuelto">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-warning" />
                      Devuelto
                    </div>
                  </SelectItem>
                  <SelectItem value="rechazado">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Rechazado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Label>Seleccionar Facturas</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Seleccionar todas
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deseleccionar
              </Button>
            </div>
          </div>

          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-2 space-y-2">
              {unpaidInvoices && unpaidInvoices.length > 0 ? (
                unpaidInvoices.map((invoice) => (
                  <div key={invoice.id} className="space-y-2">
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedInvoices.includes(invoice.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => toggleInvoice(invoice.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedInvoices.includes(invoice.id)} />
                        <div>
                          <p className="font-mono text-sm font-medium">
                            FF-{String(invoice.invoice_number).padStart(4, "0")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client?.name}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(Number(invoice.total || 0))}</p>
                    </div>

                    {/* Show return reason selector when selected and status is not cobrado */}
                    {selectedInvoices.includes(invoice.id) && bulkStatus !== "cobrado" && (
                      <div className="ml-8 space-y-2 pb-2">
                        <Select
                          value={selectedReasons[invoice.id] || ""}
                          onValueChange={(v) =>
                            setSelectedReasons((prev) => ({ ...prev, [invoice.id]: v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Motivo de devolución" />
                          </SelectTrigger>
                          <SelectContent>
                            {returnReasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedReasons[invoice.id] === "Otro motivo" && (
                          <Textarea
                            placeholder="Especifique el motivo..."
                            value={customReasons[invoice.id] || ""}
                            onChange={(e) =>
                              setCustomReasons((prev) => ({
                                ...prev,
                                [invoice.id]: e.target.value,
                              }))
                            }
                            className="text-sm"
                            rows={2}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay facturas pendientes de pago
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedInvoices.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facturas seleccionadas:</span>
                <span className="font-medium">{selectedInvoices.length}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Total:</span>
                <span
                  className={`font-bold text-lg ${
                    bulkStatus === "cobrado" ? "text-success" : "text-destructive"
                  }`}
                >
                  {bulkStatus === "cobrado" ? "+" : "-"}
                  {formatCurrency(totalSelected)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedInvoices.length === 0 || registerPayment.isPending}
          >
            {registerPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar {selectedInvoices.length} pago(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
