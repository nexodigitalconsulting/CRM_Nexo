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

export function usePdfSettings() {
  return useQuery({
    queryKey: ["pdf_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as PdfSettings;
    },
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