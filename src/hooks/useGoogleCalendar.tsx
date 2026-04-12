"use client";

// Migrado de Supabase a Drizzle - v2
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  fetchGoogleCalendarEvents,
  getGoogleCalendarAuthUrl,
  disconnectGoogleCalendar,
  type GoogleCalendarEvent,
  type GoogleCalendarResponse,
} from "@/lib/api/google-calendar";

export type { GoogleCalendarEvent };

export function useGoogleCalendar(timeMin?: string, timeMax?: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const query = useQuery({
    queryKey: ["google-calendar-events", session?.user?.id, timeMin, timeMax],
    queryFn: (): Promise<GoogleCalendarResponse> => {
      if (!session?.user?.id) return Promise.resolve({ connected: false, events: [] });
      return fetchGoogleCalendarEvents("", timeMin, timeMax);
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const connectGoogleCalendar = useCallback(async () => {
    if (!session?.user?.id) {
      toast.error("Debes iniciar sesión primero");
      return;
    }

    setIsConnecting(true);

    try {
      const authUrl = await getGoogleCalendarAuthUrl("");

      // Open popup for OAuth
      const popup = window.open(
        authUrl,
        "google-calendar-auth",
        "width=600,height=700,scrollbars=yes"
      );

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "google-calendar-success") {
          toast.success("Google Calendar conectado correctamente");
          queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
          setIsConnecting(false);
          window.removeEventListener("message", handleMessage);
        } else if (event.data?.type === "google-calendar-error") {
          toast.error(`Error: ${event.data.error}`);
          setIsConnecting(false);
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup was closed without completing
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setIsConnecting(false);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      toast.error("Error al conectar con Google Calendar");
      setIsConnecting(false);
    }
  }, [session, queryClient]);

  const disconnectCalendar = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      await disconnectGoogleCalendar(session.user.id);
      toast.success("Google Calendar desconectado");
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Error al desconectar Google Calendar");
    }
  }, [session, queryClient]);

  return {
    events: query.data?.events || [],
    isConnected: query.data?.connected || false,
    needsReauth: query.data?.needsReauth || false,
    isLoading: query.isLoading,
    isConnecting,
    connectGoogleCalendar,
    disconnectGoogleCalendar: disconnectCalendar,
    refetch: query.refetch,
  };
}
