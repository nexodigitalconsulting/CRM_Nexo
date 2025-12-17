import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  from_email: string;
  from_name: string | null;
  is_active: boolean;
  signature_html: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  template_type: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRule {
  id: string;
  rule_type: string;
  name: string;
  description: string | null;
  days_threshold: number;
  is_active: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientNotificationPreference {
  id: string;
  client_id: string;
  rule_type: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Email Settings hooks
export function useEmailSettings() {
  return useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("email_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        
        // Handle missing table or column gracefully
        if (error) {
          // If table doesn't exist or column missing, return null
          if (error.code === "42P01" || error.code === "42703" || error.message?.includes("does not exist")) {
            console.warn("email_settings table or column missing:", error.message);
            return null;
          }
          throw error;
        }
        
        return data as EmailSettings | null;
      } catch (err: any) {
        console.warn("Error fetching email settings:", err.message);
        return null;
      }
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<EmailSettings>) => {
      const { data: existing } = await supabase
        .from("email_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("email_settings")
          .update(settings)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("email_settings")
          .insert(settings as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configuración de email guardada");
    },
    onError: (error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });
}

// Email Templates hooks
export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_type");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Plantilla actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

// Notification Rules hooks
export function useNotificationRules() {
  return useQuery({
    queryKey: ["notification-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .order("rule_type");
      if (error) throw error;
      return data as NotificationRule[];
    },
  });
}

export function useCreateNotificationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<NotificationRule, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("notification_rules")
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear regla: " + error.message);
    },
  });
}

export function useUpdateNotificationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotificationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("notification_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

export function useDeleteNotificationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla eliminada");
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}

// Client notification preferences
export function useClientNotificationPreferences(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-notification-preferences", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_notification_preferences")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as ClientNotificationPreference[];
    },
    enabled: !!clientId,
  });
}

export function useUpdateClientNotificationPreference() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, ruleType, isEnabled }: { clientId: string; ruleType: string; isEnabled: boolean }) => {
      const { data: existing } = await supabase
        .from("client_notification_preferences")
        .select("id")
        .eq("client_id", clientId)
        .eq("rule_type", ruleType)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("client_notification_preferences")
          .update({ is_enabled: isEnabled })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("client_notification_preferences")
          .insert({ client_id: clientId, rule_type: ruleType, is_enabled: isEnabled })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-notification-preferences", variables.clientId] });
      toast.success("Preferencia actualizada");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

// Send email function
export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ 
      to, 
      cc,
      subject, 
      html, 
      entityType, 
      entityId,
      attachPdf,
      pdfBase64,
      pdfHtml,
      pdfFilename
    }: { 
      to: string; 
      cc?: string;
      subject: string; 
      html: string;
      entityType?: string;
      entityId?: string;
      attachPdf?: boolean;
      pdfBase64?: string;
      pdfHtml?: string;
      pdfFilename?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, cc, subject, html, entityType, entityId, attachPdf, pdfBase64, pdfHtml, pdfFilename }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Email enviado correctamente");
    },
    onError: (error) => {
      toast.error("Error al enviar email: " + error.message);
    },
  });
}

// Test email connection
export function useTestEmailConnection() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { test: true }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Conexión SMTP exitosa");
    },
    onError: (error) => {
      toast.error("Error de conexión: " + error.message);
    },
  });
}

// Notification history
export interface NotificationLog {
  id: string;
  rule_type: string;
  entity_type: string;
  entity_id: string;
  client_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  client?: {
    name: string;
    email: string | null;
  } | null;
}

export function useNotificationHistory(year?: number, page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ["notification-history", year, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("notification_queue")
        .select("*, client:clients(name, email)", { count: "exact" })
        .order("created_at", { ascending: false });
      
      // Filtrar por año si se especifica
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31T23:59:59`;
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }
      
      // Paginación
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      if (error) throw error;
      return { 
        data: data as NotificationLog[], 
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
  });
}

// Obtener años disponibles en el historial
export function useNotificationHistoryYears() {
  return useQuery({
    queryKey: ["notification-history-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("created_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const years = new Set<number>();
      data?.forEach(item => {
        const year = new Date(item.created_at).getFullYear();
        years.add(year);
      });
      
      return Array.from(years).sort((a, b) => b - a);
    },
  });
}
