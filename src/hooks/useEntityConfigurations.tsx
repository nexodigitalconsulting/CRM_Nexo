import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "phone" | "url" | "number" | "date" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
}

export interface EntityConfiguration {
  id: string;
  entity_name: string;
  display_name: string;
  icon: string | null;
  fields: EntityField[];
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export const useEntityConfigurations = () => {
  return useQuery({
    queryKey: ["entity_configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_configurations")
        .select("*")
        .order("display_name");

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        fields: (item.fields as unknown as EntityField[]) || [],
      })) as EntityConfiguration[];
    },
  });
};

export const useEntityConfiguration = (entityName: string) => {
  return useQuery({
    queryKey: ["entity_configurations", entityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_configurations")
        .select("*")
        .eq("entity_name", entityName)
        .single();

      if (error) throw error;
      return {
        ...data,
        fields: (data.fields as unknown as EntityField[]) || [],
      } as EntityConfiguration;
    },
    enabled: !!entityName,
  });
};

export const useUpdateEntityConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields, display_name, icon }: { 
      id: string; 
      fields?: EntityField[];
      display_name?: string;
      icon?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (fields) updateData.fields = fields;
      if (display_name) updateData.display_name = display_name;
      if (icon) updateData.icon = icon;

      const { data, error } = await supabase
        .from("entity_configurations")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity_configurations"] });
      toast.success("Configuración actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
};

export const useCreateEntityConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      entity_name: string;
      display_name: string;
      icon?: string | null;
      fields?: EntityField[];
      is_system?: boolean | null;
      is_active?: boolean | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const insertData = {
        entity_name: config.entity_name,
        display_name: config.display_name,
        icon: config.icon,
        fields: JSON.parse(JSON.stringify(config.fields || [])),
        is_system: config.is_system,
        is_active: config.is_active,
        created_by: userData.user?.id,
      };

      const { data, error } = await supabase
        .from("entity_configurations")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity_configurations"] });
      toast.success("Entidad creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear entidad: " + error.message);
    },
  });
};
