// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchClients,
  fetchClient as fetchClientById,
  createClient,
  updateClient,
  deleteClient,
  type ClientRow,
  type ClientInsert as ClientInsertApi,
  type ClientUpdate as ClientUpdateApi,
} from "@/lib/api/clients";

export type Client = ClientRow;
export type ClientInsert = ClientInsertApi;
export type ClientUpdate = Partial<ClientInsertApi>;

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchClientById(id).catch(() => null);
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (client: ClientInsert) => createClient(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el cliente: " + error.message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...client }: ClientUpdate & { id: string }) =>
      updateClient(id, client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el cliente: " + error.message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el cliente: " + error.message);
    },
  });
}
