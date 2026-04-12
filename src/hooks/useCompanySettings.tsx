// Migrado de Supabase a Drizzle - v2
// NOTA: uploadCompanyLogo sigue usando Supabase Storage hasta Fase M4 (→ Cloudflare R2)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCompanySettings,
  upsertCompanySettings,
  uploadCompanyLogo,
  type CompanySettingsRow,
} from "@/lib/api/settings";

export type CompanySettings = CompanySettingsRow;

export interface CompanySettingsUpdate {
  name?: string;
  cif?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  country?: string | null;
  logo_url?: string | null;
  website?: string | null;
  iban?: string | null;
  currency?: string;
  timezone?: string;
  language?: string;
  date_format?: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: fetchCompanySettings,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: CompanySettingsUpdate) =>
      upsertCompanySettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Configuración guardada");
    },
    onError: (error: Error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const publicUrl = await uploadCompanyLogo(file);
      // Update settings with new logo URL
      await upsertCompanySettings({ logo_url: publicUrl });
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo subido correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al subir logo: " + error.message);
    },
  });
}
