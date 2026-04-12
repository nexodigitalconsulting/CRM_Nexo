// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEntityConfigurations,
  fetchEntityConfiguration,
  upsertEntityConfiguration,
  deleteEntityConfiguration,
  type EntityConfigurationRow,
} from "@/lib/api/entity-configurations";
import { useAuth } from "@/hooks/useAuth";

export interface EntityField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "phone" | "url" | "number" | "date" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
}

export interface EntityConfiguration extends Omit<EntityConfigurationRow, "fields"> {
  fields: EntityField[];
}

export const useEntityConfigurations = () => {
  return useQuery({
    queryKey: ["entity_configurations"],
    queryFn: async () => {
      const data = await fetchEntityConfigurations();
      return data.map((item) => ({
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
      const data = await fetchEntityConfiguration(entityName);
      if (!data) throw new Error("Entity configuration not found");
      return { ...data, fields: (data.fields as unknown as EntityField[]) || [] } as EntityConfiguration;
    },
    enabled: !!entityName,
  });
};

export const useUpdateEntityConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id: _id,
      fields,
      display_name,
      icon,
      entity_name,
    }: {
      id: string;
      entity_name: string;
      fields?: EntityField[];
      display_name?: string;
      icon?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (fields) updateData.fields = fields;
      if (display_name) updateData.display_name = display_name;
      if (icon) updateData.icon = icon;
      return upsertEntityConfiguration(entity_name, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity_configurations"] });
      toast.success("Configuración actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
};

export const useCreateEntityConfiguration = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (config: {
      entity_name: string;
      display_name: string;
      icon?: string | null;
      fields?: EntityField[];
      is_system?: boolean | null;
      is_active?: boolean | null;
    }) =>
      upsertEntityConfiguration(config.entity_name, {
        display_name: config.display_name,
        icon: config.icon ?? null,
        fields: config.fields ?? [],
        is_system: config.is_system ?? false,
        is_active: config.is_active ?? true,
        created_by: session?.user?.id ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity_configurations"] });
      toast.success("Entidad creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear entidad: " + error.message);
    },
  });
};
