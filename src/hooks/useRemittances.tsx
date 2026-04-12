// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRemittances,
  fetchRemittance,
  fetchAvailableInvoicesForRemittance,
  createRemittance,
  updateRemittance,
  addInvoicesToRemittance,
  removeInvoicesFromRemittance,
  registerRemittancePayment,
  cancelRemittance,
  markRemittanceAsSent,
  deleteRemittance,
  type RemittanceRow,
  type RemittanceInsert as RemittanceInsertApi,
} from "@/lib/api/remittances";
import { useAuth } from "@/hooks/useAuth";

export type Remittance = RemittanceRow;
export type RemittanceInsert = RemittanceInsertApi;
export type RemittanceUpdate = Partial<RemittanceInsertApi>;
export type RemittanceWithDetails = RemittanceRow;

export interface RemittanceInvoice {
  id: string;
  invoice_number: number;
  total: number | null;
  issue_date: string;
  due_date: string | null;
  status: string | null;
  client?: {
    id: string;
    name: string;
    iban: string | null;
    bic?: string | null;
    sepa_mandate_id?: string | null;
    sepa_mandate_date?: string | null;
    sepa_sequence_type?: string | null;
  } | null;
}

export interface RemittancePayment {
  id: string;
  remittance_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  status: "cobrado" | "devuelto" | "rechazado";
  return_reason: string | null;
  created_at: string | null;
  invoice?: {
    invoice_number: number;
    client?: { name: string } | null;
  };
}

export function useRemittances() {
  return useQuery({
    queryKey: ["remittances"],
    queryFn: fetchRemittances,
  });
}

export function useRemittance(id: string | undefined) {
  return useQuery({
    queryKey: ["remittances", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchRemittance(id);
    },
    enabled: !!id,
  });
}

export function useAvailableInvoicesForRemittance(_excludeRemittanceId?: string) {
  return useQuery({
    queryKey: ["invoices-for-remittance", _excludeRemittanceId],
    queryFn: () => fetchAvailableInvoicesForRemittance(),
  });
}

export function useCreateRemittance() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      remittance,
      invoiceIds,
    }: {
      remittance: RemittanceInsert;
      invoiceIds: string[];
    }) => {
      const created = await createRemittance({
        ...remittance,
        created_by: session?.user?.id ?? null,
      });
      if (invoiceIds.length > 0) {
        await addInvoicesToRemittance(created.id, invoiceIds);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear la remesa: " + error.message);
    },
  });
}

export function useUpdateRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, remittance }: { id: string; remittance: RemittanceUpdate }) =>
      updateRemittance(id, remittance),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      toast.success("Remesa actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

export function useAddInvoicesToRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ remittanceId, invoiceIds }: { remittanceId: string; invoiceIds: string[] }) =>
      addInvoicesToRemittance(remittanceId, invoiceIds),
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Facturas añadidas a la remesa");
    },
    onError: (error: Error) => {
      toast.error("Error al añadir facturas: " + error.message);
    },
  });
}

export function useRemoveInvoicesFromRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ remittanceId, invoiceIds }: { remittanceId: string; invoiceIds: string[] }) =>
      removeInvoicesFromRemittance(remittanceId, invoiceIds),
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Facturas eliminadas de la remesa");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar facturas: " + error.message);
    },
  });
}

export function useRegisterRemittancePayment() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: ({
      remittanceId,
      payments,
    }: {
      remittanceId: string;
      payments: Array<{
        invoice_id: string;
        amount: number;
        payment_date: string;
        status: "cobrado" | "devuelto" | "rechazado";
        return_reason?: string;
      }>;
    }) =>
      registerRemittancePayment(
        remittanceId,
        payments,
        session?.user?.id ?? ""
      ),
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Pagos registrados correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al registrar pagos: " + error.message);
    },
  });
}

export function useCancelRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelRemittance(id, reason ?? ""),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa anulada");
    },
    onError: (error: Error) => {
      toast.error("Error al anular: " + error.message);
    },
  });
}

export function useMarkRemittanceAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markRemittanceAsSent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      toast.success("Remesa marcada como enviada al banco");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRemittance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa eliminada");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}
