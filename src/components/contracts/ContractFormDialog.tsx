import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClients } from "@/hooks/useClients";
import { useActiveServices } from "@/hooks/useServices";
import { useApprovedQuotes, ContractWithDetails, useCreateContract, useUpdateContract } from "@/hooks/useContracts";
import { Plus, Trash2, FileText, ArrowRight, Calculator, Calendar } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";
import { es } from "date-fns/locale";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  client_id: z.string().min(1, "El cliente es requerido"),
  quote_id: z.string().optional(),
  start_date: z.string().min(1, "La fecha de inicio es requerida"),
  end_date: z.string().optional(),
  billing_period: z.enum(["monthly", "quarterly", "annual", "one_time", "other"]),
  status: z.enum(["pending_activation", "active", "expired", "cancelled"]).optional(),
  payment_status: z.enum(["pending", "paid", "partial", "claimed"]).optional(),
  notes: z.string().optional(),
});

interface ServiceLine {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
}

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: ContractWithDetails;
}

const billingPeriodLabels: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
  one_time: "Puntual",
  other: "Otro",
};

export function ContractFormDialog({ open, onOpenChange, contract }: ContractFormDialogProps) {
  const [activeTab, setActiveTab] = useState("from-quote");
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const { data: clients } = useClients();
  const { data: services } = useActiveServices();
  const { data: approvedQuotes } = useApprovedQuotes();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      client_id: "",
      quote_id: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      billing_period: "monthly",
      status: "pending_activation",
      payment_status: "pending",
      notes: "",
    },
  });

  useEffect(() => {
    if (contract) {
      setActiveTab("manual");
      form.reset({
        name: contract.name || "",
        client_id: contract.client_id,
        quote_id: contract.quote_id || "",
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        billing_period: contract.billing_period || "monthly",
        status: contract.status || "pending_activation",
        payment_status: contract.payment_status || "pending",
        notes: contract.notes || "",
      });
      if (contract.services) {
        setServiceLines(contract.services.map(s => ({
          service_id: s.service_id,
          service_name: s.service?.name || "",
          quantity: s.quantity || 1,
          unit_price: Number(s.unit_price),
          discount_percent: Number(s.discount_percent) || 0,
          discount_amount: Number(s.discount_amount) || 0,
          subtotal: Number(s.subtotal),
          iva_percent: Number(s.iva_percent) || 21,
          iva_amount: Number(s.iva_amount) || 0,
          total: Number(s.total),
        })));
      }
    } else {
      form.reset();
      setServiceLines([]);
      setSelectedQuoteId(null);
    }
  }, [contract, form, open]);

  const handleSelectQuote = (quoteId: string) => {
    const quote = approvedQuotes?.find(q => q.id === quoteId);
    if (quote) {
      setSelectedQuoteId(quoteId);
      form.setValue("name", quote.name || `Contrato - ${quote.client?.name}`);
      form.setValue("client_id", quote.client_id || "");
      form.setValue("quote_id", quoteId);
      
      // Calculate end date based on billing period
      const startDate = new Date();
      const billingPeriod = form.getValues("billing_period");
      let endDate = startDate;
      
      switch (billingPeriod) {
        case "monthly":
          endDate = addMonths(startDate, 1);
          break;
        case "quarterly":
          endDate = addMonths(startDate, 3);
          break;
        case "annual":
          endDate = addYears(startDate, 1);
          break;
        case "one_time":
        case "other":
          endDate = addMonths(startDate, 1);
          break;
      }
      
      form.setValue("end_date", format(endDate, "yyyy-MM-dd"));

      // Convert quote services to contract services
      if (quote.services) {
        setServiceLines(quote.services.map((s: any) => ({
          service_id: s.service_id,
          service_name: s.service?.name || "",
          quantity: s.quantity || 1,
          unit_price: Number(s.unit_price),
          discount_percent: Number(s.discount_percent) || 0,
          discount_amount: Number(s.discount_amount) || 0,
          subtotal: Number(s.subtotal),
          iva_percent: Number(s.iva_percent) || 21,
          iva_amount: Number(s.iva_amount) || 0,
          total: Number(s.total),
        })));
      }
    }
  };

  const handleAddService = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (service && !serviceLines.find(l => l.service_id === serviceId)) {
      const quantity = 1;
      const unitPrice = Number(service.price);
      const discountPercent = 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = (subtotal * discountPercent) / 100;
      const taxableAmount = subtotal - discountAmount;
      const ivaPercent = Number(service.iva_percent) || 21;
      const ivaAmount = (taxableAmount * ivaPercent) / 100;
      const total = taxableAmount + ivaAmount;

      setServiceLines([...serviceLines, {
        service_id: serviceId,
        service_name: service.name,
        quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        subtotal,
        iva_percent: ivaPercent,
        iva_amount: ivaAmount,
        total,
      }]);
    }
  };

  const handleUpdateServiceLine = (index: number, field: keyof ServiceLine, value: number) => {
    const updated = [...serviceLines];
    const line = { ...updated[index], [field]: value };
    
    const subtotal = line.quantity * line.unit_price;
    line.subtotal = subtotal;
    line.discount_amount = (subtotal * line.discount_percent) / 100;
    const taxableAmount = subtotal - line.discount_amount;
    line.iva_amount = (taxableAmount * line.iva_percent) / 100;
    line.total = taxableAmount + line.iva_amount;
    
    updated[index] = line;
    setServiceLines(updated);
  };

  const handleRemoveService = (index: number) => {
    setServiceLines(serviceLines.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = serviceLines.reduce((sum, line) => sum + line.subtotal - line.discount_amount, 0);
    const ivaTotal = serviceLines.reduce((sum, line) => sum + line.iva_amount, 0);
    const total = subtotal + ivaTotal;
    return { subtotal, ivaTotal, total };
  };

  const totals = calculateTotals();

  const handleBillingPeriodChange = (value: string) => {
    form.setValue("billing_period", value as any);
    const startDateStr = form.getValues("start_date");
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      let endDate = startDate;
      
      switch (value) {
        case "monthly":
          endDate = addMonths(startDate, 1);
          break;
        case "quarterly":
          endDate = addMonths(startDate, 3);
          break;
        case "annual":
          endDate = addYears(startDate, 1);
          break;
        case "one_time":
        case "other":
          endDate = addMonths(startDate, 1);
          break;
      }
      
      form.setValue("end_date", format(endDate, "yyyy-MM-dd"));
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const contractData = {
      name: values.name,
      client_id: values.client_id,
      quote_id: values.quote_id || null,
      start_date: values.start_date,
      end_date: values.end_date || null,
      billing_period: values.billing_period,
      status: values.status,
      payment_status: values.payment_status,
      notes: values.notes || null,
      subtotal: totals.subtotal,
      iva_total: totals.ivaTotal,
      total: totals.total,
    };

    const servicesData = serviceLines.map(line => ({
      service_id: line.service_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      discount_percent: line.discount_percent,
      discount_amount: line.discount_amount,
      subtotal: line.subtotal,
      iva_percent: line.iva_percent,
      iva_amount: line.iva_amount,
      total: line.total,
    }));

    if (contract) {
      await updateContract.mutateAsync({ id: contract.id, contract: contractData, services: servicesData });
    } else {
      await createContract.mutateAsync({ contract: contractData, services: servicesData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {contract ? "Editar Contrato" : "Nuevo Contrato"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 px-1">
              {!contract && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="from-quote" className="gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Desde Presupuesto
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Manual
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="from-quote" className="mt-4">
                    {approvedQuotes && approvedQuotes.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Selecciona un presupuesto aprobado para convertirlo en contrato:
                        </p>
                        <div className="grid gap-3">
                          {approvedQuotes.map((quote) => (
                            <div
                              key={quote.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                                selectedQuoteId === quote.id ? "border-primary bg-primary/5" : "border-border"
                              }`}
                              onClick={() => handleSelectQuote(quote.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{quote.name || `Presupuesto #${quote.quote_number}`}</p>
                                  <p className="text-sm text-muted-foreground">{quote.client?.name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">{Number(quote.total).toLocaleString("es-ES")}€</p>
                                  <Badge variant="outline" className="text-xs">
                                    #{quote.quote_number}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No hay presupuestos aprobados disponibles</p>
                        <p className="text-sm">Crea uno manualmente o aprueba un presupuesto primero</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nombre del Contrato</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Mantenimiento Web Anual" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Periodicidad de Facturación</FormLabel>
                        <Select onValueChange={handleBillingPeriodChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(billingPeriodLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha de Inicio
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Fecha de Fin
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status (only when editing) */}
                {contract && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado del Contrato</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending_activation">Pendiente de Activación</SelectItem>
                              <SelectItem value="active">Vigente</SelectItem>
                              <SelectItem value="expired">Vencido</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado de Pago</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="paid">Pagado</SelectItem>
                              <SelectItem value="partial">Pago Parcial</SelectItem>
                              <SelectItem value="claimed">Reclamado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Services */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Servicios Incluidos
                    </h3>
                    <Select onValueChange={handleAddService}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Añadir servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services?.filter(s => !serviceLines.find(l => l.service_id === s.id)).map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {Number(service.price).toLocaleString("es-ES")}€
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {serviceLines.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Servicio</th>
                            <th className="text-center p-3 w-20">Cant.</th>
                            <th className="text-right p-3 w-28">Precio</th>
                            <th className="text-center p-3 w-20">Dto.%</th>
                            <th className="text-right p-3 w-28">Total</th>
                            <th className="p-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceLines.map((line, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3">{line.service_name}</td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => handleUpdateServiceLine(index, "quantity", Number(e.target.value))}
                                  className="h-8 text-center"
                                />
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unit_price}
                                  onChange={(e) => handleUpdateServiceLine(index, "unit_price", Number(e.target.value))}
                                  className="h-8 text-right"
                                />
                              </td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.discount_percent}
                                  onChange={(e) => handleUpdateServiceLine(index, "discount_percent", Number(e.target.value))}
                                  className="h-8 text-center"
                                />
                              </td>
                              <td className="p-3 text-right font-medium">
                                {line.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€
                              </td>
                              <td className="p-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveService(index)}
                                  className="h-8 w-8 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      Añade servicios al contrato
                    </div>
                  )}

                  {/* Totals */}
                  {serviceLines.length > 0 && (
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>{totals.subtotal.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA:</span>
                          <span>{totals.ivaTotal.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base pt-2 border-t">
                          <span>Total:</span>
                          <span className="text-primary">{totals.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionales del contrato..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createContract.isPending || updateContract.isPending}>
                {contract ? "Guardar Cambios" : "Crear Contrato"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
