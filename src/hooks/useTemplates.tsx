import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  name: string;
  entity_type: "contract" | "invoice" | "quote";
  content: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TemplateInsert {
  name: string;
  entity_type: "contract" | "invoice" | "quote";
  content: string;
  variables?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  content?: string;
  variables?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

export function useTemplates(entityType?: "contract" | "invoice" | "quote") {
  return useQuery({
    queryKey: ["templates", entityType],
    queryFn: async () => {
      let query = supabase
        .from("document_templates")
        .select("*")
        .order("name");
      
      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as DocumentTemplate[];
    },
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as DocumentTemplate | null;
    },
    enabled: !!id,
  });
}

export function useDefaultTemplate(entityType: "contract" | "invoice" | "quote") {
  return useQuery({
    queryKey: ["templates", "default", entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("entity_type", entityType)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as DocumentTemplate | null;
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: TemplateInsert) => {
      const { data, error } = await supabase
        .from("document_templates")
        .insert({
          ...template,
          variables: template.variables || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear la plantilla: " + error.message);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, template }: { id: string; template: TemplateUpdate }) => {
      const { data, error } = await supabase
        .from("document_templates")
        .update(template)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla actualizada correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar la plantilla: " + error.message);
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, entityType }: { id: string; entityType: string }) => {
      // Remove default from all templates of this type
      await supabase
        .from("document_templates")
        .update({ is_default: false })
        .eq("entity_type", entityType);
      
      // Set new default
      const { data, error } = await supabase
        .from("document_templates")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla predeterminada actualizada");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla eliminada correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar la plantilla: " + error.message);
    },
  });
}

// Function to render template with variables
export function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Handle simple variables {{variable}}
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value !== "object") {
      const regex = new RegExp(`{{${key}}}`, "g");
      rendered = rendered.replace(regex, String(value ?? ""));
    }
  });
  
  // Handle array sections {{#array}}...{{/array}}
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const sectionRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, "g");
      rendered = rendered.replace(sectionRegex, (_, content) => {
        return value.map(item => {
          let itemContent = content;
          Object.entries(item).forEach(([itemKey, itemValue]) => {
            const itemRegex = new RegExp(`{{${itemKey}}}`, "g");
            itemContent = itemContent.replace(itemRegex, String(itemValue ?? ""));
          });
          return itemContent;
        }).join("");
      });
    }
  });
  
  // Handle conditional sections for non-array values
  Object.entries(data).forEach(([key, value]) => {
    if (!Array.isArray(value)) {
      const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, "g");
      rendered = rendered.replace(conditionalRegex, value ? "$1" : "");
    }
  });
  
  return rendered;
}
