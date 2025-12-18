import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PdfTemplate {
  id: string;
  name: string;
  entity_type: 'invoice' | 'contract' | 'quote';
  content: string;
  variables: string[] | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PdfTemplateCreate {
  name: string;
  entity_type: 'invoice' | 'contract' | 'quote';
  content: string;
  variables?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface PdfTemplateUpdate {
  name?: string;
  content?: string;
  variables?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

export function usePdfTemplates(entityType?: 'invoice' | 'contract' | 'quote') {
  return useQuery({
    queryKey: ['pdf-templates', entityType],
    queryFn: async () => {
      let query = supabase
        .from('document_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }

      return (data || []).map((t): PdfTemplate => ({
        id: t.id,
        name: t.name,
        entity_type: t.entity_type as 'invoice' | 'contract' | 'quote',
        content: t.content,
        variables: Array.isArray(t.variables) ? (t.variables as string[]) : null,
        is_default: t.is_default ?? false,
        is_active: t.is_active ?? true,
        created_at: t.created_at ?? '',
        updated_at: t.updated_at ?? '',
      }));
    },
  });
}

export function useCreatePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: PdfTemplateCreate) => {
      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          name: template.name,
          entity_type: template.entity_type,
          content: template.content,
          variables: (template.variables || []) as unknown as Json,
          is_default: template.is_default ?? false,
          is_active: template.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      toast.success('Plantilla creada correctamente');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Error al crear la plantilla');
    },
  });
}

export function useUpdatePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PdfTemplateUpdate }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.variables !== undefined) updateData.variables = updates.variables as unknown as Json;
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      toast.success('Plantilla actualizada');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Error al actualizar la plantilla');
    },
  });
}

export function useDeletePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      toast.success('Plantilla eliminada');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, entityType }: { id: string; entityType: string }) => {
      // First, unset all defaults for this entity type
      await supabase
        .from('document_templates')
        .update({ is_default: false })
        .eq('entity_type', entityType);

      // Then set the new default
      const { data, error } = await supabase
        .from('document_templates')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      toast.success('Plantilla establecida como predeterminada');
    },
    onError: (error) => {
      console.error('Error setting default template:', error);
      toast.error('Error al establecer plantilla predeterminada');
    },
  });
}
