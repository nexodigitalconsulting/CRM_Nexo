import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Service = Tables<"services">;
export type ServiceInsert = TablesInsert<"services">;
export type ServiceUpdate = TablesUpdate<"services">;

export interface ServiceUsage {
  in_invoices: number;
  in_quotes: number;
  in_contracts: number;
  can_delete: boolean;
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("service_number", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveServices() {
  return useQuery({
    queryKey: ["services", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "activo")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCheckServiceUsage() {
  return useMutation({
    mutationFn: async (serviceId: string): Promise<ServiceUsage> => {
      // Consultar uso en paralelo
      const [invoicesResult, quotesResult, contractsResult] = await Promise.all([
        supabase.from("invoice_services").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
        supabase.from("quote_services").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
        supabase.from("contract_services").select("id", { count: "exact", head: true }).eq("service_id", serviceId),
      ]);
      
      const in_invoices = invoicesResult.count || 0;
      const in_quotes = quotesResult.count || 0;
      const in_contracts = contractsResult.count || 0;
      
      return {
        in_invoices,
        in_quotes,
        in_contracts,
        can_delete: in_invoices === 0 && in_quotes === 0 && in_contracts === 0,
      };
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (service: ServiceInsert) => {
      const { data, error } = await supabase
        .from("services")
        .insert(service)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear el servicio: " + error.message);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...service }: ServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("services")
        .update(service)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el servicio: " + error.message);
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el servicio: " + error.message);
    },
  });
}
