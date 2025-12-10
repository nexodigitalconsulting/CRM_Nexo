import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
}

interface GoogleCalendarResponse {
  connected: boolean;
  events: GoogleCalendarEvent[];
  needsReauth?: boolean;
  error?: string;
}

export function useGoogleCalendar(timeMin?: string, timeMax?: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchEvents = async (): Promise<GoogleCalendarResponse> => {
    if (!session?.access_token) {
      return { connected: false, events: [] };
    }

    const params = new URLSearchParams();
    if (timeMin) params.set("timeMin", timeMin);
    if (timeMax) params.set("timeMax", timeMax);

    const { data, error } = await supabase.functions.invoke("google-calendar-events", {
      body: null,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error("Error fetching Google Calendar events:", error);
      return { connected: false, events: [] };
    }

    return data as GoogleCalendarResponse;
  };

  const query = useQuery({
    queryKey: ["google-calendar-events", session?.user?.id, timeMin, timeMax],
    queryFn: fetchEvents,
    enabled: !!session?.access_token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const connectGoogleCalendar = useCallback(async () => {
    if (!session?.access_token) {
      toast.error("Debes iniciar sesión primero");
      return;
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || !data?.authUrl) {
        throw new Error(error?.message || "No se pudo obtener la URL de autenticación");
      }

      // Open popup for OAuth
      const popup = window.open(
        data.authUrl,
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

  const disconnectGoogleCalendar = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from("google_calendar_config")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;

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
    disconnectGoogleCalendar,
    refetch: query.refetch,
  };
}
