import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Campaign = Tables<"campaigns">;
export type CampaignInsert = TablesInsert<"campaigns">;
export type CampaignUpdate = TablesUpdate<"campaigns">;

export const useCampaigns = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<CampaignInsert, "id" | "campaign_number" | "created_at" | "updated_at">) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          ...campaign,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear la campaña: " + error.message);
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...campaign }: CampaignUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(campaign)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña actualizada correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar la campaña: " + error.message);
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña eliminada correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar la campaña: " + error.message);
    },
  });
};

export const useConvertCampaignToContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Campaign) => {
      // 1. Create contact from campaign data
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          name: campaign.business_name || campaign.name,
          email: campaign.email,
          phone: campaign.phone,
          source: "campaña",
          place_id: campaign.place_id,
          status: "nuevo",
        })
        .select()
        .single();
      
      if (contactError) throw contactError;
      
      // 2. Update campaign status to "cliente"
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ 
          status: "cliente",
          last_contact_at: new Date().toISOString()
        })
        .eq("id", campaign.id);
      
      if (updateError) throw updateError;
      
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Campaña convertida a contacto");
    },
    onError: (error) => {
      toast.error("Error al convertir la campaña: " + error.message);
    },
  });
};
