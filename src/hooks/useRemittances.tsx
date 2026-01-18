import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Remittance = Tables<"remittances">;
export type RemittanceInsert = TablesInsert<"remittances">;
export type RemittanceUpdate = TablesUpdate<"remittances">;

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
  status: 'cobrado' | 'devuelto' | 'rechazado';
  return_reason: string | null;
  created_at: string | null;
  invoice?: {
    invoice_number: number;
    client?: { name: string } | null;
  };
}

export interface RemittanceWithDetails extends Remittance {
  invoices?: RemittanceInvoice[];
  payments?: RemittancePayment[];
}

export function useRemittances() {
  return useQuery({
    queryKey: ["remittances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("remittances")
        .select("*")
        .order("remittance_number", { ascending: false });

      if (error) throw error;
      return data as Remittance[];
    },
  });
}

export function useRemittance(id: string | undefined) {
  return useQuery({
    queryKey: ["remittances", id],
    queryFn: async () => {
      if (!id) return null;
      
      // Fetch remittance with invoices
      const { data: remittance, error } = await supabase
        .from("remittances")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!remittance) return null;

      // Fetch related invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, issue_date, due_date, status,
          client:clients(id, name, iban, bic, sepa_mandate_id, sepa_mandate_date, sepa_sequence_type)
        `)
        .eq("remittance_id", id)
        .order("invoice_number", { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from("remittance_payments")
        .select(`
          *,
          invoice:invoices(invoice_number, client:clients(name))
        `)
        .eq("remittance_id", id)
        .order("payment_date", { ascending: false });

      return {
        ...remittance,
        invoices: invoices || [],
        payments: payments || [],
      } as RemittanceWithDetails;
    },
    enabled: !!id,
  });
}

export function useAvailableInvoicesForRemittance(excludeRemittanceId?: string) {
  return useQuery({
    queryKey: ["invoices-for-remittance", excludeRemittanceId],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, issue_date, due_date, status,
          client:clients(id, name, iban, bic, sepa_mandate_id, sepa_mandate_date, sepa_sequence_type)
        `)
        .eq("status", "emitida")
        .is("remittance_id", null)
        .order("invoice_number", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as RemittanceInvoice[];
    },
  });
}

export function useCreateRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      remittance, 
      invoiceIds 
    }: { 
      remittance: RemittanceInsert; 
      invoiceIds: string[] 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("remittances")
        .insert({ ...remittance, created_by: user.user?.id })
        .select()
        .single();

      if (error) throw error;

      // Update invoices with remittance_id
      if (invoiceIds.length > 0) {
        const { error: updateError } = await supabase
          .from("invoices")
          .update({ remittance_id: data.id })
          .in("id", invoiceIds);

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear la remesa: " + error.message);
    },
  });
}

export function useUpdateRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, remittance }: { id: string; remittance: RemittanceUpdate }) => {
      const { data, error } = await supabase
        .from("remittances")
        .update(remittance)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      toast.success("Remesa actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

export function useAddInvoicesToRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ remittanceId, invoiceIds }: { remittanceId: string; invoiceIds: string[] }) => {
      // Update invoices with remittance_id
      const { error } = await supabase
        .from("invoices")
        .update({ remittance_id: remittanceId })
        .in("id", invoiceIds);

      if (error) throw error;

      // Recalculate totals
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total")
        .eq("remittance_id", remittanceId);

      const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
      const invoiceCount = invoices?.length || 0;

      await supabase
        .from("remittances")
        .update({ total_amount: totalAmount, invoice_count: invoiceCount })
        .eq("id", remittanceId);

      return { totalAmount, invoiceCount };
    },
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Facturas añadidas a la remesa");
    },
    onError: (error) => {
      toast.error("Error al añadir facturas: " + error.message);
    },
  });
}

export function useRemoveInvoicesFromRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ remittanceId, invoiceIds }: { remittanceId: string; invoiceIds: string[] }) => {
      // Remove remittance_id from invoices
      const { error } = await supabase
        .from("invoices")
        .update({ remittance_id: null })
        .in("id", invoiceIds);

      if (error) throw error;

      // Recalculate totals
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total")
        .eq("remittance_id", remittanceId);

      const totalAmount = invoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
      const invoiceCount = invoices?.length || 0;

      await supabase
        .from("remittances")
        .update({ total_amount: totalAmount, invoice_count: invoiceCount })
        .eq("id", remittanceId);

      return { totalAmount, invoiceCount };
    },
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Facturas eliminadas de la remesa");
    },
    onError: (error) => {
      toast.error("Error al eliminar facturas: " + error.message);
    },
  });
}

export function useRegisterRemittancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      remittanceId,
      payments,
    }: {
      remittanceId: string;
      payments: Array<{
        invoice_id: string;
        amount: number;
        payment_date: string;
        status: 'cobrado' | 'devuelto' | 'rechazado';
        return_reason?: string;
      }>;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // Insert payment records
      const { error } = await supabase
        .from("remittance_payments")
        .insert(
          payments.map((p) => ({
            remittance_id: remittanceId,
            invoice_id: p.invoice_id,
            amount: p.amount,
            payment_date: p.payment_date,
            status: p.status,
            return_reason: p.return_reason || null,
            created_by: user.user?.id,
          }))
        );

      if (error) throw error;

      // Update invoice status based on payment status
      for (const payment of payments) {
        if (payment.status === 'cobrado') {
          await supabase
            .from("invoices")
            .update({ status: "pagada" })
            .eq("id", payment.invoice_id);
        } else if (payment.status === 'devuelto' || payment.status === 'rechazado') {
          // Release invoice from remittance on rejection
          await supabase
            .from("invoices")
            .update({ remittance_id: null, status: "emitida" })
            .eq("id", payment.invoice_id);
        }
      }

      // Recalculate paid_amount and update remittance status
      const { data: allPayments } = await supabase
        .from("remittance_payments")
        .select("amount, status")
        .eq("remittance_id", remittanceId);

      const paidAmount = allPayments
        ?.filter((p) => p.status === 'cobrado')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Get remaining invoices
      const { data: remainingInvoices } = await supabase
        .from("invoices")
        .select("total")
        .eq("remittance_id", remittanceId);

      const { data: remittance } = await supabase
        .from("remittances")
        .select("total_amount")
        .eq("id", remittanceId)
        .single();

      const totalAmount = Number(remittance?.total_amount || 0);
      const remainingAmount = remainingInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;

      // Determine new status
      type RemittanceStatus = 'pendiente' | 'enviada' | 'cobrada' | 'parcial' | 'devuelta' | 'anulada' | 'vencida';
      let newStatus: RemittanceStatus = 'enviada';
      if (paidAmount >= totalAmount && totalAmount > 0) {
        newStatus = 'cobrada';
      } else if (paidAmount > 0) {
        newStatus = 'parcial';
      } else if (remainingAmount === 0 && totalAmount > 0) {
        newStatus = 'devuelta';
      }

      await supabase
        .from("remittances")
        .update({ 
          paid_amount: paidAmount,
          status: newStatus,
          invoice_count: remainingInvoices?.length || 0,
          total_amount: remainingAmount,
        })
        .eq("id", remittanceId);

      return { paidAmount, newStatus };
    },
    onSuccess: (_, { remittanceId }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", remittanceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Pagos registrados correctamente");
    },
    onError: (error) => {
      toast.error("Error al registrar pagos: " + error.message);
    },
  });
}

export function useCancelRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      // Release all invoices from this remittance
      await supabase
        .from("invoices")
        .update({ remittance_id: null })
        .eq("remittance_id", id);

      // Update remittance status
      const { error } = await supabase
        .from("remittances")
        .update({
          status: "anulada",
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason || null,
          invoice_count: 0,
          total_amount: 0,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa anulada");
    },
    onError: (error) => {
      toast.error("Error al anular: " + error.message);
    },
  });
}

export function useMarkRemittanceAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("remittances")
        .update({
          status: "enviada",
          sent_to_bank_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["remittances", id] });
      toast.success("Remesa marcada como enviada al banco");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First remove remittance_id from invoices
      await supabase
        .from("invoices")
        .update({ remittance_id: null })
        .eq("remittance_id", id);

      const { error } = await supabase
        .from("remittances")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-for-remittance"] });
      toast.success("Remesa eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}
