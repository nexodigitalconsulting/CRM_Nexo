import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TableView {
  id: string;
  user_id: string;
  entity_name: string;
  view_name: string;
  visible_columns: string[];
  column_order: string[];
  filters: Record<string, unknown>;
  sort_config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableViewInsert {
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_table_views")
        .select("*")
        .eq("entity_name", entityName)
        .order("is_default", { ascending: false })
        .order("view_name");

      if (error) throw error;
      return data as TableView[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useDefaultTableView(entityName: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["table-view-default", entityName, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_table_views")
        .select("*")
        .eq("entity_name", entityName)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return data as TableView | null;
    },
    enabled: !!session?.user?.id,
  });
}

export function useCreateTableView() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (view: TableViewInsert) => {
      if (!session?.user?.id) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("user_table_views")
        .insert({
          entity_name: view.entity_name,
          view_name: view.view_name,
          visible_columns: view.visible_columns as unknown as string,
          column_order: (view.column_order || []) as unknown as string,
          filters: (view.filters || {}) as unknown as string,
          sort_config: (view.sort_config || {}) as unknown as string,
          is_default: view.is_default || false,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TableView;
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
    mutationFn: async ({ id, view }: { id: string; view: Partial<TableViewInsert> }) => {
      const updateData: Record<string, unknown> = {};
      if (view.view_name) updateData.view_name = view.view_name;
      if (view.visible_columns) updateData.visible_columns = view.visible_columns;
      if (view.column_order) updateData.column_order = view.column_order;
      if (view.filters) updateData.filters = view.filters;
      if (view.sort_config) updateData.sort_config = view.sort_config;
      if (view.is_default !== undefined) updateData.is_default = view.is_default;

      const { data, error } = await supabase
        .from("user_table_views")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as TableView;
    },
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
    mutationFn: async ({ id, entityName }: { id: string; entityName: string }) => {
      const { error } = await supabase
        .from("user_table_views")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return entityName;
    },
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
