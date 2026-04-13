import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFlows, createFlow, updateFlow, deleteFlow, triggerFlow, type FlowRow, type FlowInsertPayload } from "@/lib/api/flows";
import { toast } from "sonner";

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: fetchFlows,
  });
}

export function useCreateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FlowInsertPayload) => createFlow(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flujo creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FlowInsertPayload> & { status?: FlowRow["status"] } }) =>
      updateFlow(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFlow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flujo eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTriggerFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: Record<string, unknown> }) =>
      triggerFlow(id, payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      if (result.ok) {
        toast.success(result.executionId ? `Ejecución iniciada (ID: ${result.executionId})` : "Flujo disparado correctamente");
      } else {
        toast.error(result.error ?? "Error al disparar el flujo");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
