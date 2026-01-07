import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateQuote, useUpdateQuote, useQuote, QuoteWithDetails } from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";
import { useContacts } from "@/hooks/useContacts";
import { useActiveServices, Service } from "@/hooks/useServices";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: QuoteWithDetails | null;
}

interface ServiceLine {
  service_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  iva_percent: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

export function QuoteFormDialog({ open, onOpenChange, quote }: QuoteFormDialogProps) {
  const { data: clients } = useClients();
  const { data: contacts } = useContacts();
  const { data: services } = useActiveServices();
  
  // Fetch full quote with services when editing
  const { data: fullQuote } = useQuote(quote?.id);
  const quoteWithServices = fullQuote || quote;
  
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  
  const isEditing = !!quoteWithServices?.id;
  const isLoading = createQuote.isPending || updateQuote.isPending;

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);

  useEffect(() => {
    if (quoteWithServices) {
      setName(quoteWithServices.name || "");
      setClientId(quoteWithServices.client_id || "");
      setContactId(quoteWithServices.contact_id || "");
      setValidUntil(quoteWithServices.valid_until || "");
      setNotes(quoteWithServices.notes || "");
      
      if (quoteWithServices.services && quoteWithServices.services.length > 0) {
        setServiceLines(quoteWithServices.services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity || 1,
          unit_price: s.unit_price,
          discount_percent: Number(s.discount_percent) || 0,
          iva_percent: Number(s.iva_percent) || 21,
        })));
      } else {
        setServiceLines([]);
      }
    } else {
      setName("");
      setClientId("");
      setContactId("");
      setValidUntil("");
      setNotes("");
      setServiceLines([]);
    }
  }, [quoteWithServices, open]);

  const addServiceLine = () => {
    if (services && services.length > 0) {
      const firstService = services[0];
      setServiceLines([...serviceLines, {
        service_id: firstService.id,
        quantity: 1,
        unit_price: firstService.price,
        discount_percent: 0,
        iva_percent: Number(firstService.iva_percent) || 21,
      }]);
    }
  };

  const removeServiceLine = (index: number) => {
    setServiceLines(serviceLines.filter((_, i) => i !== index));
  };

  const updateServiceLine = (index: number, field: keyof ServiceLine, value: string | number) => {
    const updated = [...serviceLines];
    if (field === "service_id") {
      const selectedService = services?.find(s => s.id === value);
      if (selectedService) {
        updated[index] = {
          ...updated[index],
          service_id: value as string,
          unit_price: selectedService.price,
          iva_percent: Number(selectedService.iva_percent) || 21,
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setServiceLines(updated);
  };

  const calculateLineTotal = (line: ServiceLine) => {
    const subtotal = line.quantity * line.unit_price;
    const discount = subtotal * (line.discount_percent / 100);
    const base = subtotal - discount;
    const iva = base * (line.iva_percent / 100);
    return { subtotal: base, iva, total: base + iva };
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let ivaTotal = 0;
    
    serviceLines.forEach(line => {
      const { subtotal: lineSubtotal, iva } = calculateLineTotal(line);
      subtotal += lineSubtotal;
      ivaTotal += iva;
    });
    
    return { subtotal, iva: ivaTotal, total: subtotal + ivaTotal };
  }, [serviceLines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId && !contactId) {
      toast.error("Selecciona un cliente o contacto");
      return;
    }
    
    if (serviceLines.length === 0) {
      toast.error("Añade al menos un servicio");
      return;
    }

    const quoteData = {
      name: name || `Presupuesto ${new Date().toLocaleDateString("es-ES")}`,
      client_id: clientId || null,
      contact_id: contactId || null,
      valid_until: validUntil || null,
      notes: notes || null,
      subtotal: totals.subtotal,
      iva_total: totals.iva,
      total: totals.total,
      status: quote?.status || "draft" as const,
    };

    const servicesData = serviceLines.map(line => {
      const calc = calculateLineTotal(line);
      return {
        service_id: line.service_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percent: line.discount_percent,
        discount_amount: (line.quantity * line.unit_price) * (line.discount_percent / 100),
        iva_percent: line.iva_percent,
        iva_amount: calc.iva,
        subtotal: calc.subtotal,
        total: calc.total,
      };
    });

    try {
      if (isEditing && quoteWithServices) {
        await updateQuote.mutateAsync({ id: quoteWithServices.id, quote: quoteData, services: servicesData });
      } else {
        await createQuote.mutateAsync({ quote: quoteData, services: servicesData });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getServiceById = (id: string): Service | undefined => services?.find(s => s.id === id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "Editar Presupuesto" : "Nuevo Presupuesto"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Presupuesto</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Propuesta Marketing Digital"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Válido hasta</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Client/Contact Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId || "none"} onValueChange={(v) => { setClientId(v === "none" ? "" : v); setContactId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients?.filter(c => c.id).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.cif && `(${client.cif})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>O Contacto (Lead)</Label>
              <Select value={contactId || "none"} onValueChange={(v) => { setContactId(v === "none" ? "" : v); setClientId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar contacto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin contacto</SelectItem>
                  {contacts?.filter(c => c.status !== "convertido" && c.id).map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.email && `(${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Servicios</Label>
              <Button type="button" variant="outline" size="sm" onClick={addServiceLine} disabled={!services?.length}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir Servicio
              </Button>
            </div>

            {serviceLines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No hay servicios añadidos. Haz clic en "Añadir Servicio" para comenzar.
              </div>
            ) : (
              <div className="space-y-3">
                {serviceLines.map((line, index) => {
                  const lineCalc = calculateLineTotal(line);
                  const service = getServiceById(line.service_id);
                  
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Servicio</Label>
                        <Select 
                          value={line.service_id} 
                          onValueChange={(v) => updateServiceLine(index, "service_id", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {services?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Cant.</Label>
                        <Input
                          type="number"
                          min="1"
                          className="h-9"
                          value={line.quantity}
                          onChange={(e) => updateServiceLine(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Precio Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9"
                          value={line.unit_price}
                          onChange={(e) => updateServiceLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Dto. %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="h-9"
                          value={line.discount_percent}
                          onChange={(e) => updateServiceLine(index, "discount_percent", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">IVA %</Label>
                        <Input
                          type="number"
                          className="h-9"
                          value={line.iva_percent}
                          onChange={(e) => updateServiceLine(index, "iva_percent", parseFloat(e.target.value) || 21)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Total</Label>
                        <div className="h-9 flex items-center font-semibold">
                          {formatCurrency(lineCalc.total)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-destructive"
                          onClick={() => removeServiceLine(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals */}
          {serviceLines.length > 0 && (
            <div className="bg-card border rounded-lg p-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA:</span>
                    <span>{formatCurrency(totals.iva)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas / Condiciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Condiciones de pago, validez, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Presupuesto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
