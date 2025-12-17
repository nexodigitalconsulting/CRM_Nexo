import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PdfSettings {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  show_logo: boolean;
  logo_position: 'left' | 'center' | 'right';
  show_iban_footer: boolean;
  show_notes: boolean;
  show_discounts_column: boolean;
  header_style: 'classic' | 'modern' | 'minimal';
  font_size_base: number;
  created_at: string;
  updated_at: string;
}

export type PdfSettingsUpdate = Partial<Omit<PdfSettings, 'id' | 'created_at' | 'updated_at'>>;

// Valores por defecto si la tabla no existe o está vacía
export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  id: '',
  primary_color: '#3366cc',
  secondary_color: '#666666',
  accent_color: '#0066cc',
  show_logo: true,
  logo_position: 'left',
  show_iban_footer: true,
  show_notes: true,
  show_discounts_column: true,
  header_style: 'classic',
  font_size_base: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function usePdfSettings() {
  return useQuery({
    queryKey: ["pdf_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      // Si hay error (tabla no existe) o no hay datos, retornar defaults
      if (error) {
        console.warn('pdf_settings no disponible, usando valores por defecto:', error.message);
        return DEFAULT_PDF_SETTINGS;
      }
      
      return (data as PdfSettings) || DEFAULT_PDF_SETTINGS;
    },
    // No fallar si la tabla no existe
    retry: false,
  });
}

export function useUpdatePdfSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, settings }: { id: string; settings: PdfSettingsUpdate }) => {
      const { data, error } = await supabase
        .from("pdf_settings")
        .update(settings)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PdfSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf_settings"] });
      toast.success("Configuración de PDF guardada");
    },
    onError: (error) => {
      toast.error("Error al guardar configuración: " + error.message);
    },
  });
}