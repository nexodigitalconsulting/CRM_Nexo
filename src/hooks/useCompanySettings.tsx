import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanySettings {
  id: string;
  name: string;
  cif: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string | null;
  logo_url: string | null;
  website: string | null;
  iban: string | null;
  currency: string;
  timezone: string;
  language: string;
  date_format: string;
  created_at: string;
  updated_at: string;
}

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: CompanySettingsUpdate) => {
      // First check if settings exist
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("company_settings")
          .update(settings)
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("company_settings")
          .insert({ name: settings.name || "Mi Empresa", ...settings })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Configuración guardada");
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        // If bucket doesn't exist, create it first (admin only)
        throw new Error("Error al subir el logo. Asegúrate de que el bucket 'company-assets' existe.");
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);
      
      // Update company settings with logo URL
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from("company_settings")
          .update({ logo_url: publicUrl })
          .eq("id", existing.id);
      }
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Logo subido correctamente");
    },
    onError: (error) => {
      toast.error("Error al subir logo: " + error.message);
    },
  });
}
