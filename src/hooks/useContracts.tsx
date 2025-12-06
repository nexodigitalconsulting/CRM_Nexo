import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Contract = Tables<"contracts">;
export type ContractInsert = TablesInsert<"contracts">;
export type ContractUpdate = TablesUpdate<"contracts">;
export type ContractService = Tables<"contract_services">;
export type ContractServiceInsert = TablesInsert<"contract_services">;

export interface ContractWithDetails extends Contract {
  client?: Tables<"clients"> | null;
  quote?: Tables<"quotes"> | null;
  services?: (ContractService & { service: Tables<"services"> })[];
}

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          client:clients(*),
          quote:quotes(*)
        `)
        .order("contract_number", { ascending: false });
      
      if (error) throw error;
      return data as ContractWithDetails[];
    },
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          client:clients(*),
          quote:quotes(*),
          services:contract_services(*, service:services(*))
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ContractWithDetails | null;
    },
    enabled: !!id,
  });
}

export function useApprovedQuotes() {
  return useQuery({
    queryKey: ["quotes", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          client:clients(*),
          contact:contacts(*),
          services:quote_services(*, service:services(*))
        `)
        .eq("status", "approved")
        .order("quote_number", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      contract, 
      services 
    }: { 
      contract: ContractInsert; 
      services: Omit<ContractServiceInsert, "contract_id">[] 
    }) => {
      const { data: newContract, error: contractError } = await supabase
        .from("contracts")
        .insert(contract)
        .select()
        .single();
      
      if (contractError) throw contractError;
      
      if (services.length > 0) {
        const contractServices = services.map(s => ({
          ...s,
          contract_id: newContract.id,
        }));
        
        const { error: servicesError } = await supabase
          .from("contract_services")
          .insert(contractServices);
        
        if (servicesError) throw servicesError;
      }

      // The contract already has quote_id linked, no need to update quote status
      // since "converted" is not a valid status. The link is the reference.
      if (contract.quote_id) {
        // Quote is linked via quote_id in contract - no status change needed
      }
      
      return newContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Contrato creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear el contrato: " + error.message);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      contract, 
      services 
    }: { 
      id: string;
      contract: ContractUpdate; 
      services: Omit<ContractServiceInsert, "contract_id">[] 
    }) => {
      const { data: updatedContract, error: contractError } = await supabase
        .from("contracts")
        .update(contract)
        .eq("id", id)
        .select()
        .single();
      
      if (contractError) throw contractError;
      
      const { error: deleteError } = await supabase
        .from("contract_services")
        .delete()
        .eq("contract_id", id);
      
      if (deleteError) throw deleteError;
      
      if (services.length > 0) {
        const contractServices = services.map(s => ({
          ...s,
          contract_id: id,
        }));
        
        const { error: servicesError } = await supabase
          .from("contract_services")
          .insert(contractServices);
        
        if (servicesError) throw servicesError;
      }
      
      return updatedContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el contrato: " + error.message);
    },
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Contract["status"] }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("contract_services").delete().eq("contract_id", id);
      
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el contrato: " + error.message);
    },
  });
}
