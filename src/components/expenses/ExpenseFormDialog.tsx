import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateExpense, useUpdateExpense, type Expense } from "@/hooks/useExpenses";
import { Receipt } from "lucide-react";

const expenseSchema = z.object({
  expense_number: z.string().min(1, "El número de gasto es requerido").max(50),
  supplier_name: z.string().min(1, "El nombre del proveedor es requerido").max(200),
  supplier_cif: z.string().max(20).optional(),
  invoice_number: z.string().max(50).optional(),
  id_factura: z.string().max(100).optional(),
  issue_date: z.string().min(1, "La fecha de emisión es requerida"),
  due_date: z.string().optional(),
  concept: z.string().max(500).optional(),
  subtotal: z.coerce.number().min(0, "El subtotal debe ser positivo"),
  iva_percent: z.coerce.number().min(0).max(100).default(21),
  irpf_percent: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().default("EUR"),
  status: z.string().default("pendiente"),
  notes: z.string().max(1000).optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditing = !!expense;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_number: "",
      supplier_name: "",
      supplier_cif: "",
      invoice_number: "",
      id_factura: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      concept: "",
      subtotal: 0,
      iva_percent: 21,
      irpf_percent: 0,
      currency: "EUR",
      status: "pendiente",
      notes: "",
    },
  });

  useEffect(() => {
      if (expense) {
        form.reset({
          expense_number: expense.expense_number || "",
          supplier_name: expense.supplier_name || "",
          supplier_cif: expense.supplier_cif || "",
          invoice_number: expense.invoice_number || "",
          id_factura: expense.id_factura || "",
        issue_date: expense.issue_date || new Date().toISOString().split("T")[0],
        due_date: expense.due_date || "",
        concept: expense.concept || "",
        subtotal: Number(expense.subtotal) || 0,
        iva_percent: Number(expense.iva_percent) || 21,
        irpf_percent: Number(expense.irpf_percent) || 0,
        currency: expense.currency || "EUR",
        status: expense.status || "pendiente",
        notes: expense.notes || "",
      });
      } else {
        form.reset({
          expense_number: "",
          supplier_name: "",
          supplier_cif: "",
          invoice_number: "",
          id_factura: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        concept: "",
        subtotal: 0,
        iva_percent: 21,
        irpf_percent: 0,
        currency: "EUR",
        status: "pendiente",
        notes: "",
      });
    }
  }, [expense, form]);

  const watchSubtotal = form.watch("subtotal");
  const watchIvaPercent = form.watch("iva_percent");
  const watchIrpfPercent = form.watch("irpf_percent");

  const subtotal = Number(watchSubtotal) || 0;
  const ivaPercent = Number(watchIvaPercent) || 0;
  const irpfPercent = Number(watchIrpfPercent) || 0;

  const ivaAmount = (subtotal * ivaPercent) / 100;
  const irpfAmount = (subtotal * irpfPercent) / 100;
  const total = subtotal + ivaAmount - irpfAmount;

  const onSubmit = async (data: ExpenseFormData) => {
    const expenseData = {
      expense_number: data.expense_number,
      supplier_name: data.supplier_name,
      supplier_cif: data.supplier_cif || null,
      invoice_number: data.invoice_number || null,
      id_factura: data.id_factura || null,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      concept: data.concept || null,
      subtotal: data.subtotal,
      iva_percent: data.iva_percent,
      irpf_percent: data.irpf_percent,
      currency: data.currency,
      status: data.status,
      notes: data.notes || null,
      iva_amount: ivaAmount,
      irpf_amount: irpfAmount,
      total: total,
    };

    if (isEditing && expense) {
      await updateExpense.mutateAsync({ id: expense.id, ...expenseData });
    } else {
      await createExpense.mutateAsync(expenseData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isEditing ? "Editar Gasto" : "Nuevo Gasto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Expense Number */}
            <FormField
              control={form.control}
              name="expense_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Gasto *</FormLabel>
                  <FormControl>
                    <Input placeholder="G-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier_cif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIF Proveedor</FormLabel>
                    <FormControl>
                      <Input placeholder="B12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº Factura</FormLabel>
                    <FormControl>
                      <Input placeholder="FAC-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id_factura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Factura</FormLabel>
                    <FormControl>
                      <Input placeholder="Identificador interno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Emisión *</FormLabel>
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
                    <FormLabel>Fecha Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Concept */}
            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del gasto..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amounts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="subtotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iva_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA %</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="irpf_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IRPF %</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calculated Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({ivaPercent}%):</span>
                <span>+{ivaAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IRPF ({irpfPercent}%):</span>
                <span>-{irpfAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
                <span>Total:</span>
                <span className="text-primary">{total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {isEditing ? "Guardar Cambios" : "Crear Gasto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
