// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  setDefaultDocumentTemplate,
  deleteDocumentTemplate,
  type DocumentTemplateRow,
  type DocumentTemplateInsert,
  type DocumentTemplateUpdate,
} from "@/lib/api/pdf-templates";

export type PdfTemplate = DocumentTemplateRow;
export type PdfTemplateCreate = DocumentTemplateInsert;
export type PdfTemplateUpdate = DocumentTemplateUpdate;

export function usePdfTemplates(entityType?: "invoice" | "contract" | "quote") {
  return useQuery({
    queryKey: ["pdf-templates", entityType],
    queryFn: () => fetchDocumentTemplates(entityType),
  });
}

export function useCreatePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: PdfTemplateCreate) => createDocumentTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["default-template"] });
      toast.success("Plantilla creada correctamente");
    },
    onError: (error: Error) => {
      console.error("Error creating template:", error);
      toast.error("Error al crear la plantilla");
    },
  });
}

export function useUpdatePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PdfTemplateUpdate }) =>
      updateDocumentTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["default-template"] });
      toast.success("Plantilla actualizada");
    },
    onError: (error: Error) => {
      console.error("Error updating template:", error);
      toast.error("Error al actualizar la plantilla");
    },
  });
}

export function useDeletePdfTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDocumentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["default-template"] });
      toast.success("Plantilla eliminada");
    },
    onError: (error: Error) => {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar la plantilla");
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, entityType }: { id: string; entityType: string }) =>
      setDefaultDocumentTemplate(id, entityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["default-template"] });
      toast.success("Plantilla establecida como predeterminada");
    },
    onError: (error: Error) => {
      console.error("Error setting default template:", error);
      toast.error("Error al establecer plantilla predeterminada");
    },
  });
}
