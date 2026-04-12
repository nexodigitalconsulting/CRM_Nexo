// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  markInvoiceAsSent,
  deleteInvoice,
  type InvoiceRow,
  type InvoiceServiceRow,
} from "@/lib/api/invoices";
import { fetchContractsForInvoice } from "@/lib/api/contracts";

export interface InvoiceService {
  id?: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
  description?: string;
  service?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface InvoiceWithDetails {
  id: string;
  invoice_number: number;
  client_id: string;
  contract_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: "borrador" | "emitida" | "pagada" | "cancelada";
  subtotal: number | null;
  iva_percent: number | null;
  iva_amount: number | null;
  irpf_percent?: number | null;
  irpf_amount?: number | null;
  total: number | null;
  notes: string | null;
  document_url: string | null;
  remittance_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  client?: {
    id: string;
    name: string;
    cif: string | null;
    email: string | null;
    iban: string | null;
  };
  contract?: {
    id: string;
    name: string | null;
    contract_number: number;
  };
  services?: InvoiceService[];
}

export interface InvoiceInsert {
  client_id: string;
  contract_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  status?: "borrador" | "emitida" | "pagada" | "cancelada";
  subtotal?: number;
  iva_percent?: number;
  iva_amount?: number;
  irpf_percent?: number;
  irpf_amount?: number;
  total?: number;
  notes?: string | null;
  services: InvoiceService[];
}

export interface InvoiceUpdate {
  client_id?: string;
  contract_id?: string | null;
  issue_date?: string;
  due_date?: string | null;
  status?: "borrador" | "emitida" | "pagada" | "cancelada";
  subtotal?: number;
  iva_percent?: number;
  iva_amount?: number;
  irpf_percent?: number;
  irpf_amount?: number;
  total?: number;
  notes?: string | null;
  services?: InvoiceService[];
}

function toInvoiceWithDetails(row: InvoiceRow): InvoiceWithDetails {
  return {
    ...row,
    status: row.status as InvoiceWithDetails["status"],
    services: row.invoice_services?.map((s) => ({
      id: s.id,
      service_id: s.service_id,
      quantity: s.quantity,
      unit_price: Number(s.unit_price),
      discount_percent: Number(s.discount_percent),
      discount_amount: Number(s.discount_amount),
      subtotal: Number(s.subtotal),
      iva_percent: Number(s.iva_percent),
      iva_amount: Number(s.iva_amount),
      total: Number(s.total),
      description: s.description ?? undefined,
    })),
  } as unknown as InvoiceWithDetails;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const rows = await fetchInvoices();
      return rows as unknown as InvoiceWithDetails[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      if (!id) return null;
      const row = await fetchInvoice(id);
      return toInvoiceWithDetails(row);
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { services, ...invoiceData } = invoice;
      const serviceRows = services.map((s) => ({
        service_id: s.service_id,
        quantity: s.quantity,
        unit_price: s.unit_price,
        discount_percent: s.discount_percent,
        discount_amount: s.discount_amount,
        subtotal: s.subtotal,
        iva_percent: s.iva_percent,
        iva_amount: s.iva_amount,
        total: s.total,
        description: s.description,
      })) as Omit<InvoiceServiceRow, "id" | "invoice_id" | "created_at">[];
      return createInvoice(invoiceData as Parameters<typeof createInvoice>[0], serviceRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear la factura: " + error.message);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, invoice }: { id: string; invoice: InvoiceUpdate }) => {
      const { services, ...invoiceData } = invoice;
      const serviceRows = services?.map((s) => ({
        service_id: s.service_id,
        quantity: s.quantity,
        unit_price: s.unit_price,
        discount_percent: s.discount_percent,
        discount_amount: s.discount_amount,
        subtotal: s.subtotal,
        iva_percent: s.iva_percent,
        iva_amount: s.iva_amount,
        total: s.total,
        description: s.description,
      })) as Omit<InvoiceServiceRow, "id" | "invoice_id" | "created_at">[] | undefined;
      return updateInvoice(id, invoiceData as Parameters<typeof updateInvoice>[1], serviceRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar la factura: " + error.message);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "borrador" | "emitida" | "pagada" | "cancelada" }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Estado de factura actualizado");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar la factura: " + error.message);
    },
  });
}

export function useContractsForInvoice() {
  return useQuery({
    queryKey: ["contracts", "for-invoice"],
    queryFn: fetchContractsForInvoice,
  });
}

export function useMarkInvoiceAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markInvoiceAsSent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: Error) => {
      toast.error("Error al marcar como enviada: " + error.message);
    },
  });
}
