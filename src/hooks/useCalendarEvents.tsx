import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  category_id: string | null;
  importance: "alta" | "media" | "baja";
  location: string | null;
  client_id: string | null;
  contact_id: string | null;
  contract_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  is_synced_to_google: boolean;
  reminder_minutes: number | null;
  recurrence_rule: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: CalendarCategory | null;
  client?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
}

export interface CalendarCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  importance: "alta" | "media" | "baja";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInsert {
  title: string;
  description?: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
  category_id?: string | null;
  importance?: "alta" | "media" | "baja";
  location?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
  contract_id?: string | null;
  reminder_minutes?: number | null;
  notes?: string | null;
}

// Calendar Events
export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select(`
          *,
          category:calendar_categories(*),
          client:clients(id, name),
          contact:contacts(id, name)
        `)
        .order("start_datetime", { ascending: true });
      
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: CalendarEventInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...event, user_id: userData.user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear evento: " + error.message);
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, event }: { id: string; event: Partial<CalendarEventInsert> }) => {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(event)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar evento: " + error.message);
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento eliminado");
    },
    onError: (error) => {
      toast.error("Error al eliminar evento: " + error.message);
    },
  });
}

// Calendar Categories
export function useCalendarCategories() {
  return useQuery({
    queryKey: ["calendar-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as CalendarCategory[];
    },
  });
}

export function useCreateCalendarCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; color: string; importance?: "high" | "medium" | "low" }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      
      const { data, error } = await supabase
        .from("calendar_categories")
        .insert({ ...category, user_id: userData.user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría creada");
    },
    onError: (error) => {
      toast.error("Error al crear categoría: " + error.message);
    },
  });
}

export function useUpdateCalendarCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: Partial<{ name: string; color: string; importance: "high" | "medium" | "low" }> }) => {
      const { data, error } = await supabase
        .from("calendar_categories")
        .update(category)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría actualizada");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteCalendarCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calendar_categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría eliminada");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

// User Availability
export function useUserAvailability() {
  return useQuery({
    queryKey: ["user-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_availability")
        .select("*")
        .order("day_of_week");
      
      if (error) throw error;
      return data as UserAvailability[];
    },
  });
}

export function useSetUserAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (availability: { day_of_week: number; start_time: string; end_time: string; is_available?: boolean }[]) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      
      // Delete existing availability
      await supabase
        .from("user_availability")
        .delete()
        .eq("user_id", userData.user.id);
      
      // Insert new availability
      if (availability.length > 0) {
        const { error } = await supabase
          .from("user_availability")
          .insert(availability.map(a => ({ ...a, user_id: userData.user!.id })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-availability"] });
      toast.success("Disponibilidad actualizada");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}
