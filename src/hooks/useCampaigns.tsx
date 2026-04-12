// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  convertCampaignToContact,
  type CampaignRow,
  type CampaignInsert as CampaignInsertApi,
  type CampaignUpdate as CampaignUpdateApi,
} from "@/lib/api/campaigns";
import { useAuth } from "@/hooks/useAuth";

export type Campaign = CampaignRow;
export type CampaignInsert = CampaignInsertApi;
export type CampaignUpdate = Partial<CampaignInsertApi>;

export const useCampaigns = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (campaign: Omit<CampaignInsert, "created_by">) =>
      createCampaign({ ...campaign, created_by: session?.user?.id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear la campaña: " + error.message);
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...campaign }: CampaignUpdate & { id: string }) =>
      updateCampaign(id, campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar la campaña: " + error.message);
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaña eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar la campaña: " + error.message);
    },
  });
};

export const useConvertCampaignToContact = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (campaign: Campaign) => {
      const userId = session?.user?.id ?? "";
      return convertCampaignToContact(
        campaign.id,
        {
          name: campaign.business_name || campaign.name,
          email: campaign.email,
          phone: campaign.phone,
          source: "campaña",
          status: "nuevo",
        },
        userId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Campaña convertida a contacto");
    },
    onError: (error: Error) => {
      toast.error("Error al convertir la campaña: " + error.message);
    },
  });
};
