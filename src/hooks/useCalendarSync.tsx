import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SyncEventRequest {
  eventType: "contract" | "invoice" | "billing";
  eventId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
}

export function useCalendarSync() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (request: SyncEventRequest) => {
      if (!session?.access_token) {
        throw new Error("No autenticado");
      }

      const { data, error } = await supabase.functions.invoke("sync-calendar-to-google", {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      toast.success("Evento sincronizado con Google Calendar");
    },
    onError: (error) => {
      console.error("Error syncing to Google Calendar:", error);
      toast.error("Error al sincronizar con Google Calendar");
    },
  });

  const syncContractToGoogle = useCallback(
    async (contract: {
      id: string;
      name?: string;
      contract_number: number;
      start_date: string;
      end_date?: string;
      next_billing_date?: string;
      client?: { name: string };
    }) => {
      // Sync start date
      await syncMutation.mutateAsync({
        eventType: "contract",
        eventId: contract.id,
        title: `Inicio: ${contract.name || `Contrato #${contract.contract_number}`}`,
        description: `Cliente: ${contract.client?.name || "Sin cliente"}`,
        startDate: contract.start_date,
        allDay: true,
      });

      // Sync end date if exists
      if (contract.end_date) {
        await syncMutation.mutateAsync({
          eventType: "contract",
          eventId: `${contract.id}-end`,
          title: `Fin: ${contract.name || `Contrato #${contract.contract_number}`}`,
          description: `Cliente: ${contract.client?.name || "Sin cliente"}`,
          startDate: contract.end_date,
          allDay: true,
        });
      }

      // Sync next billing date if exists
      if (contract.next_billing_date) {
        await syncMutation.mutateAsync({
          eventType: "billing",
          eventId: `${contract.id}-billing`,
          title: `Facturar: ${contract.name || `Contrato #${contract.contract_number}`}`,
          description: `Cliente: ${contract.client?.name || "Sin cliente"}`,
          startDate: contract.next_billing_date,
          allDay: true,
        });
      }
    },
    [syncMutation]
  );

  const syncInvoiceToGoogle = useCallback(
    async (invoice: {
      id: string;
      invoice_number: number;
      due_date?: string;
      client?: { name: string };
    }) => {
      if (!invoice.due_date) return;

      await syncMutation.mutateAsync({
        eventType: "invoice",
        eventId: invoice.id,
        title: `Vence: FF-${String(invoice.invoice_number).padStart(4, "0")}`,
        description: `Cliente: ${invoice.client?.name || "Sin cliente"}`,
        startDate: invoice.due_date,
        allDay: true,
      });
    },
    [syncMutation]
  );

  return {
    syncContractToGoogle,
    syncInvoiceToGoogle,
    isSyncing: syncMutation.isPending,
  };
}
