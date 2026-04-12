// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContracts,
  fetchContract,
  fetchApprovedQuotes,
  createContract,
  updateContract,
  updateContractStatus,
  markContractAsSent,
  deleteContract,
  type ContractRow,
  type ContractServiceRow,
} from "@/lib/api/contracts";

export type Contract = ContractRow;
export type ContractService = ContractServiceRow;
export type ContractWithDetails = ContractRow;

export type ContractInsert = Omit<ContractRow, "id" | "contract_number" | "created_at" | "updated_at" | "client" | "contract_services">;
export type ContractUpdate = Partial<ContractInsert>;
export type ContractServiceInsert = Omit<ContractServiceRow, "id" | "contract_id" | "created_at" | "updated_at" | "service">;

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchContract(id);
    },
    enabled: !!id,
  });
}

export function useApprovedQuotes() {
  return useQuery({
    queryKey: ["quotes", "approved"],
    queryFn: fetchApprovedQuotes,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contract,
      services,
    }: {
      contract: ContractInsert;
      services: ContractServiceInsert[];
    }) => createContract(contract, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Contrato creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el contrato: " + error.message);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      contract,
      services,
    }: {
      id: string;
      contract: ContractUpdate;
      services: ContractServiceInsert[];
    }) => updateContract(id, contract, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el contrato: " + error.message);
    },
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateContractStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Estado actualizado");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrato eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el contrato: " + error.message);
    },
  });
}

export function useMarkContractAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markContractAsSent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (error: Error) => {
      toast.error("Error al marcar como enviado: " + error.message);
    },
  });
}
