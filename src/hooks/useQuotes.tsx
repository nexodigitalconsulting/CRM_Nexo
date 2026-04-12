// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchQuotes,
  fetchQuote,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  markQuoteAsSent,
  deleteQuote,
  type QuoteRow,
  type QuoteServiceRow,
} from "@/lib/api/quotes";

export type Quote = QuoteRow;
export type QuoteWithDetails = QuoteRow;
export type QuoteService = QuoteServiceRow;
export type QuoteInsert = Omit<QuoteRow, "id" | "quote_number" | "created_at" | "updated_at" | "client" | "contact" | "quote_services">;
export type QuoteUpdate = Partial<QuoteInsert>;
export type QuoteServiceInsert = Omit<QuoteServiceRow, "id" | "quote_id" | "created_at" | "service">;

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: fetchQuotes,
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchQuote(id);
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quote,
      services,
    }: {
      quote: QuoteInsert;
      services: QuoteServiceInsert[];
    }) => createQuote(quote, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el presupuesto: " + error.message);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      quote,
      services,
    }: {
      id: string;
      quote: QuoteUpdate;
      services: QuoteServiceInsert[];
    }) => updateQuote(id, quote, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el presupuesto: " + error.message);
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateQuoteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Estado actualizado");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useMarkQuoteAsSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markQuoteAsSent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (error: Error) => {
      toast.error("Error al marcar como enviado: " + error.message);
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el presupuesto: " + error.message);
    },
  });
}
