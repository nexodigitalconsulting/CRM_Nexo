// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCalendarEvents,
  fetchCalendarCategories,
  fetchUserAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createCalendarCategory,
  updateCalendarCategory,
  deleteCalendarCategory,
  upsertUserAvailability,
  type CalendarEventRow,
  type CalendarCategoryRow,
  type UserAvailabilityRow,
} from "@/lib/api/calendar";
import { useAuth } from "@/hooks/useAuth";

export type CalendarEvent = CalendarEventRow & {
  importance: "alta" | "media" | "baja";
};
export type CalendarCategory = CalendarCategoryRow & {
  importance: "alta" | "media" | "baja";
};
export type UserAvailability = UserAvailabilityRow;

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
  const { session } = useAuth();

  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => fetchCalendarEvents(session?.user?.id ?? ""),
    enabled: !!session?.user?.id,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (event: CalendarEventInsert) => {
      if (!session?.user?.id) throw new Error("No autenticado");
      return createCalendarEvent({
        ...event,
        user_id: session.user.id,
        importance: event.importance ?? "media",
        status: "confirmed",
        is_synced_to_google: false,
        all_day: event.all_day ?? false,
        google_event_id: null,
        google_calendar_id: null,
        recurrence_rule: null,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear evento: " + error.message);
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, event }: { id: string; event: Partial<CalendarEventInsert> }) =>
      updateCalendarEvent(id, event as Parameters<typeof updateCalendarEvent>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento actualizado");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar evento: " + error.message);
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Evento eliminado");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar evento: " + error.message);
    },
  });
}

// Calendar Categories
export function useCalendarCategories() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["calendar-categories"],
    queryFn: () => fetchCalendarCategories(session?.user?.id ?? ""),
    enabled: !!session?.user?.id,
  });
}

export function useCreateCalendarCategory() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (category: { name: string; color: string; importance?: "alta" | "media" | "baja" }) => {
      if (!session?.user?.id) throw new Error("No autenticado");
      return createCalendarCategory({
        ...category,
        user_id: session.user.id,
        importance: category.importance ?? "media",
        is_default: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría creada");
    },
    onError: (error: Error) => {
      toast.error("Error al crear categoría: " + error.message);
    },
  });
}

export function useUpdateCalendarCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: Partial<{ name: string; color: string; importance: "alta" | "media" | "baja" }> }) =>
      updateCalendarCategory(id, category as Parameters<typeof updateCalendarCategory>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteCalendarCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-categories"] });
      toast.success("Categoría eliminada");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}

// User Availability
export function useUserAvailability() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["user-availability"],
    queryFn: () => fetchUserAvailability(session?.user?.id ?? ""),
    enabled: !!session?.user?.id,
  });
}

export function useSetUserAvailability() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (
      availability: { day_of_week: number; start_time: string; end_time: string; is_available?: boolean }[]
    ) => {
      if (!session?.user?.id) throw new Error("No autenticado");
      const userId = session.user.id;
      return upsertUserAvailability(
        userId,
        availability.map((a) => ({
          user_id: userId,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
          is_available: a.is_available ?? true,
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-availability"] });
      toast.success("Disponibilidad actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });
}
