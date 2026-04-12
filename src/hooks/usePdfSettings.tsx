// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchPdfSettings,
  upsertPdfSettings,
  type PdfSettingsRow,
} from "@/lib/api/settings";

export type PdfSettings = PdfSettingsRow & {
  logo_position: "left" | "center" | "right";
  header_style: "classic" | "modern" | "minimal";
};

export type PdfSettingsUpdate = Partial<Omit<PdfSettings, "id" | "created_at" | "updated_at">>;

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  id: "",
  primary_color: "#3366cc",
  secondary_color: "#666666",
  accent_color: "#0066cc",
  show_logo: true,
  logo_position: "left",
  show_iban_footer: true,
  show_notes: true,
  show_discounts_column: true,
  header_style: "classic",
  font_size_base: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function usePdfSettings() {
  return useQuery({
    queryKey: ["pdf_settings"],
    queryFn: async () => {
      try {
        const data = await fetchPdfSettings();
        return (data as PdfSettings) || DEFAULT_PDF_SETTINGS;
      } catch (err) {
        console.warn("pdf_settings no disponible, usando valores por defecto:", (err as Error).message);
        return DEFAULT_PDF_SETTINGS;
      }
    },
    retry: false,
  });
}

export function useUpdatePdfSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id: _id, settings }: { id: string; settings: PdfSettingsUpdate }) =>
      upsertPdfSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf_settings"] });
      toast.success("Configuración de PDF guardada");
    },
    onError: (error: Error) => {
      toast.error("Error al guardar configuración: " + error.message);
    },
  });
}
