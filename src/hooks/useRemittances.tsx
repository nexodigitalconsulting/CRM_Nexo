import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Remittance = Tables<"remittances">;
export type RemittanceInsert = TablesInsert<"remittances">;
export type RemittanceUpdate = TablesUpdate<"remittances">;

export interface RemittanceWithInvoices extends Remittance {
  invoices?: Array<{
    id: string;
    invoice_number: number;
    total: number;
    client?: { name: string };
  }>;
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
      const { data, error } = await supabase
        .from("remittances")
        .select(`
          *,
          invoices:invoices(
            id, invoice_number, total,
            client:clients(name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as RemittanceWithInvoices;
    },
    enabled: !!id,
  });
}

export function useAvailableInvoicesForRemittance() {
  return useQuery({
    queryKey: ["invoices-for-remittance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total, issue_date, due_date, status,
          client:clients(id, name, iban)
        `)
        .eq("status", "issued")
        .is("remittance_id", null)
        .order("invoice_number", { ascending: false });

      if (error) throw error;
      return data;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      toast.success("Remesa actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
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
      toast.success("Remesa eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}
