// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchTableViews,
  fetchDefaultTableView,
  createTableView,
  updateTableView,
  deleteTableView,
  type TableViewRow,
  type TableViewInsert,
} from "@/lib/api/table-views";
import { useAuth } from "@/hooks/useAuth";

export interface TableView extends TableViewRow {}

export interface TableViewInsertPayload {
  entity_name: string;
  view_name: string;
  visible_columns: string[];
  column_order?: string[];
  filters?: Record<string, unknown>;
  sort_config?: Record<string, unknown>;
  is_default?: boolean;
}

export function useTableViews(entityName: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["table-views", entityName, session?.user?.id],
    queryFn: () => fetchTableViews(entityName),
    enabled: !!session?.user?.id,
  });
}

export function useDefaultTableView(entityName: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["table-view-default", entityName, session?.user?.id],
    queryFn: () => fetchDefaultTableView(entityName),
    enabled: !!session?.user?.id,
  });
}

export function useCreateTableView() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (view: TableViewInsertPayload) => {
      if (!session?.user?.id) throw new Error("No authenticated user");
      return createTableView({
        user_id: session.user.id,
        entity_name: view.entity_name,
        view_name: view.view_name,
        visible_columns: view.visible_columns,
        column_order: view.column_order ?? [],
        filters: view.filters ?? {},
        sort_config: view.sort_config ?? {},
        is_default: view.is_default ?? false,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["table-views", data.entity_name] });
      queryClient.invalidateQueries({ queryKey: ["table-view-default", data.entity_name] });
      toast.success("Vista guardada");
    },
    onError: () => {
      toast.error("Error al guardar la vista");
    },
  });
}

export function useUpdateTableView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, view }: { id: string; view: Partial<TableViewInsertPayload> }) =>
      updateTableView(id, view as Partial<TableViewInsert>),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["table-views", data.entity_name] });
      queryClient.invalidateQueries({ queryKey: ["table-view-default", data.entity_name] });
      toast.success("Vista actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar la vista");
    },
  });
}

export function useDeleteTableView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, entityName }: { id: string; entityName: string }) =>
      deleteTableView(id).then(() => entityName),
    onSuccess: (entityName) => {
      queryClient.invalidateQueries({ queryKey: ["table-views", entityName] });
      queryClient.invalidateQueries({ queryKey: ["table-view-default", entityName] });
      toast.success("Vista eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar la vista");
    },
  });
}
