import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Quote = Tables<"quotes">;
export type QuoteInsert = TablesInsert<"quotes">;
export type QuoteUpdate = TablesUpdate<"quotes">;
export type QuoteService = Tables<"quote_services">;
export type QuoteServiceInsert = TablesInsert<"quote_services">;

export interface QuoteWithDetails extends Quote {
  client?: Tables<"clients"> | null;
  contact?: Tables<"contacts"> | null;
  services?: (QuoteService & { service: Tables<"services"> })[];
}

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          client:clients(*),
          contact:contacts(*),
          services:quote_services(*, service:services(*))
        `)
        .order("quote_number", { ascending: false });
      
      if (error) throw error;
      return data as QuoteWithDetails[];
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          client:clients(*),
          contact:contacts(*),
          services:quote_services(*, service:services(*))
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as QuoteWithDetails | null;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      quote, 
      services 
    }: { 
      quote: QuoteInsert; 
      services: Omit<QuoteServiceInsert, "quote_id">[] 
    }) => {
      // Create quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert(quote)
        .select()
        .single();
      
      if (quoteError) throw quoteError;
      
      // Create quote services
      if (services.length > 0) {
        const quoteServices = services.map(s => ({
          ...s,
          quote_id: newQuote.id,
        }));
        
        const { error: servicesError } = await supabase
          .from("quote_services")
          .insert(quoteServices);
        
        if (servicesError) throw servicesError;
      }
      
      return newQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear el presupuesto: " + error.message);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      quote, 
      services 
    }: { 
      id: string;
      quote: QuoteUpdate; 
      services: Omit<QuoteServiceInsert, "quote_id">[] 
    }) => {
      // Update quote
      const { data: updatedQuote, error: quoteError } = await supabase
        .from("quotes")
        .update(quote)
        .eq("id", id)
        .select()
        .single();
      
      if (quoteError) throw quoteError;
      
      // Delete existing services and recreate
      const { error: deleteError } = await supabase
        .from("quote_services")
        .delete()
        .eq("quote_id", id);
      
      if (deleteError) throw deleteError;
      
      // Create new quote services
      if (services.length > 0) {
        const quoteServices = services.map(s => ({
          ...s,
          quote_id: id,
        }));
        
        const { error: servicesError } = await supabase
          .from("quote_services")
          .insert(quoteServices);
        
        if (servicesError) throw servicesError;
      }
      
      return updatedQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el presupuesto: " + error.message);
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Quote["status"] }) => {
      const { data, error } = await supabase
        .from("quotes")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

// Mark quote as sent (for automation control)
export function useMarkQuoteAsSent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("quotes")
        .update({ 
          status: "sent" as Quote["status"],
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (error) => {
      toast.error("Error al marcar como enviado: " + error.message);
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete services first (cascade should handle this, but being explicit)
      await supabase.from("quote_services").delete().eq("quote_id", id);
      
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Presupuesto eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el presupuesto: " + error.message);
    },
  });
}
