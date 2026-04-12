// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchServices,
  fetchActiveServices,
  fetchService as fetchServiceById,
  createService,
  updateService,
  deleteService,
  checkServiceUsage,
  type ServiceRow,
  type ServiceInsert as ServiceInsertApi,
  type ServiceUpdate as ServiceUpdateApi,
} from "@/lib/api/services";

export type Service = ServiceRow;
export type ServiceInsert = ServiceInsertApi;
export type ServiceUpdate = Partial<ServiceInsertApi>;

export interface ServiceUsage {
  in_invoices: number;
  in_quotes: number;
  in_contracts: number;
  can_delete: boolean;
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });
}

export function useActiveServices() {
  return useQuery({
    queryKey: ["services", "active"],
    queryFn: fetchActiveServices,
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchServiceById(id);
    },
    enabled: !!id,
  });
}

export function useCheckServiceUsage() {
  return useMutation({
    mutationFn: async (serviceId: string): Promise<ServiceUsage> => {
      const { invoiceCount, quoteCount, contractCount } = await checkServiceUsage(serviceId);
      return {
        in_invoices: invoiceCount,
        in_quotes: quoteCount,
        in_contracts: contractCount,
        can_delete: invoiceCount === 0 && quoteCount === 0 && contractCount === 0,
      };
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (service: ServiceInsert) => createService(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el servicio: " + error.message);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...service }: ServiceUpdate & { id: string }) =>
      updateService(id, service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el servicio: " + error.message);
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el servicio: " + error.message);
    },
  });
}
