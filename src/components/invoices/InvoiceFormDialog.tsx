import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { 
  useCreateInvoice, 
  useUpdateInvoice, 
  useContractsForInvoice,
  useInvoice,
  InvoiceWithDetails 
} from "@/hooks/useInvoices";

const serviceLineSchema = z.object({
  service_id: z.string().min(1, "Selecciona un servicio"),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100),
  iva_percent: z.coerce.number().min(0),
  description: z.string().optional(),
});

const formSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  contract_id: z.string().optional(),
  issue_date: z.string().min(1, "Fecha de emisión requerida"),
  due_date: z.string().optional(),
  status: z.enum(["draft", "issued", "paid", "cancelled"]),
  notes: z.string().optional(),
  services: z.array(serviceLineSchema).min(1, "Añade al menos un servicio"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceWithDetails | null;
}

export function InvoiceFormDialog({ open, onOpenChange, invoice }: Props) {
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: contracts = [] } = useContractsForInvoice();
  // Fetch full invoice with services when editing
  const { data: fullInvoice } = useInvoice(invoice?.id);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const [totals, setTotals] = useState({ subtotal: 0, iva: 0, total: 0 });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      contract_id: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      status: "draft",
      notes: "",
      services: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const watchServices = form.watch("services");
  const selectedClientId = form.watch("client_id");
  
  // Filter contracts by selected client
  const filteredContracts = contracts.filter(c => 
    !selectedClientId || c.client_id === selectedClientId
  );

  // Use fullInvoice (with services) when available for editing
  const invoiceData = fullInvoice || invoice;

  useEffect(() => {
    if (invoiceData) {
      form.reset({
        client_id: invoiceData.client_id,
        contract_id: invoiceData.contract_id || "",
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date || "",
        status: invoiceData.status,
        notes: invoiceData.notes || "",
        services: invoiceData.services?.map((s) => ({
          service_id: s.service_id,
          quantity: s.quantity,
          unit_price: s.unit_price,
          discount_percent: s.discount_percent,
          iva_percent: s.iva_percent,
          description: s.description || "",
        })) || [],
      });
    } else {
      form.reset({
        client_id: "",
        contract_id: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        status: "draft",
        notes: "",
        services: [],
      });
    }
  }, [invoiceData, form]);

  useEffect(() => {
    let subtotal = 0;
    let iva = 0;

    watchServices?.forEach((service) => {
      const lineSubtotal = (service.quantity || 0) * (service.unit_price || 0);
      const discountAmount = lineSubtotal * ((service.discount_percent || 0) / 100);
      const lineNetSubtotal = lineSubtotal - discountAmount;
      const lineIva = lineNetSubtotal * ((service.iva_percent || 21) / 100);

      subtotal += lineNetSubtotal;
      iva += lineIva;
    });

    setTotals({
      subtotal,
      iva,
      total: subtotal + iva,
    });
  }, [watchServices]);

  const handleServiceSelect = (index: number, serviceId: string) => {
    const selectedService = services.find((s) => s.id === serviceId);
    if (selectedService) {
      form.setValue(`services.${index}.unit_price`, Number(selectedService.price));
      form.setValue(`services.${index}.iva_percent`, Number(selectedService.iva_percent) || 21);
    }
  };

  const handleContractSelect = (contractId: string) => {
    if (contractId) {
      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        form.setValue("client_id", contract.client_id);
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    const servicesData = values.services.map((s) => {
      const lineSubtotal = s.quantity * s.unit_price;
      const discountAmount = lineSubtotal * (s.discount_percent / 100);
      const netSubtotal = lineSubtotal - discountAmount;
      const ivaAmount = netSubtotal * (s.iva_percent / 100);

      return {
        service_id: s.service_id,
        quantity: s.quantity,
        unit_price: s.unit_price,
        discount_percent: s.discount_percent,
        discount_amount: discountAmount,
        subtotal: netSubtotal,
        iva_percent: s.iva_percent,
        iva_amount: ivaAmount,
        total: netSubtotal + ivaAmount,
        description: s.description,
      };
    });

    const invoiceData = {
      client_id: values.client_id,
      contract_id: values.contract_id || null,
      issue_date: values.issue_date,
      due_date: values.due_date || null,
      status: values.status,
      notes: values.notes || null,
      subtotal: totals.subtotal,
      iva_amount: totals.iva,
      total: totals.total,
      services: servicesData,
    };

    if (invoice) {
      updateInvoice.mutate(
        { id: invoice.id, invoice: invoiceData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createInvoice.mutate(invoiceData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Borrador",
    issued: "Emitida",
    paid: "Cobrada",
    cancelled: "Cancelada",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Editar Factura" : "Nueva Factura"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato (opcional)</FormLabel>
                    <Select 
                      value={field.value || "none"} 
                      onValueChange={(value) => {
                        const actualValue = value === "none" ? "" : value;
                        field.onChange(actualValue);
                        handleContractSelect(actualValue);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin contrato</SelectItem>
                        {filteredContracts.filter(c => c.id).map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            #{contract.contract_number} - {contract.name || contract.client?.name}
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
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
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
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Emisión *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
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

            <Separator />

            {/* Services */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Servicios</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      service_id: "",
                      quantity: 1,
                      unit_price: 0,
                      discount_percent: 0,
                      iva_percent: 21,
                      description: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg"
                >
                  <div className="col-span-4">
                    <FormField
                      control={form.control}
                      name={`services.${index}.service_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Servicio</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleServiceSelect(index, value);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {services
                                .filter((s) => s.status === "active")
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`services.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Cantidad</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`services.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Precio</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`services.${index}.discount_percent`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Dto. %</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <FormField
                      control={form.control}
                      name={`services.${index}.iva_percent`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">IVA %</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay servicios añadidos
                </p>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>
                    {totals.subtotal.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span>
                    {totals.iva.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>
                    {totals.total.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending || updateInvoice.isPending}
              >
                {invoice ? "Guardar Cambios" : "Crear Factura"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
