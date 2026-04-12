// Migrado de Supabase a Drizzle - v2
// M3 completado: useSendEmail y useTestEmailConnection usan fetch() via api/email.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmailSettings,
  upsertEmailSettings,
  fetchEmailTemplates,
  upsertEmailTemplate,
  deleteEmailTemplate,
  fetchNotificationRules,
  upsertNotificationRule,
  deleteNotificationRule,
  fetchClientNotificationPreferences,
  upsertClientNotificationPreference,
  sendEmail,
  testEmailConnection,
  fetchNotificationHistory,
  fetchNotificationHistoryYears,
  type EmailSettingsRow,
  type EmailTemplateRow,
  type NotificationRuleRow,
  type ClientNotificationPreferenceRow,
  type NotificationQueueRow,
  type SendEmailPayload,
} from "@/lib/api/email";
export type { SendEmailPayload };

export type EmailSettings = EmailSettingsRow;
export type EmailTemplate = EmailTemplateRow;
export type NotificationRule = NotificationRuleRow;
export type ClientNotificationPreference = ClientNotificationPreferenceRow;

// Email Settings
export function useEmailSettings() {
  return useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      try {
        return await fetchEmailSettings();
      } catch (err: unknown) {
        console.warn("Error fetching email settings:", (err as Error).message);
        return null;
      }
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<EmailSettings>) => upsertEmailSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configuración de email guardada");
    },
    onError: (error: Error) => {
      toast.error("Error al guardar: " + error.message);
    },
  });
}

// Email Templates
export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: fetchEmailTemplates,
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) =>
      upsertEmailTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Plantilla actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

// Notification Rules
export function useNotificationRules() {
  return useQuery({
    queryKey: ["notification-rules"],
    queryFn: fetchNotificationRules,
  });
}

export function useCreateNotificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<NotificationRule, "id" | "created_at" | "updated_at" | "template">) =>
      upsertNotificationRule(null, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla creada correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear regla: " + error.message);
    },
  });
}

export function useUpdateNotificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<NotificationRule> & { id: string }) =>
      upsertNotificationRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

export function useDeleteNotificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotificationRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Regla eliminada");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });
}

// Client Notification Preferences
export function useClientNotificationPreferences(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-notification-preferences", clientId],
    queryFn: () => (clientId ? fetchClientNotificationPreferences(clientId) : Promise.resolve([])),
    enabled: !!clientId,
  });
}

export function useUpdateClientNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, ruleType, isEnabled }: { clientId: string; ruleType: string; isEnabled: boolean }) =>
      upsertClientNotificationPreference(clientId, ruleType, isEnabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-notification-preferences", variables.clientId] });
      toast.success("Preferencia actualizada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (payload: SendEmailPayload) =>
      sendEmail(payload),
    onSuccess: () => {
      toast.success("Email enviado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al enviar email: " + error.message);
    },
  });
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: () => testEmailConnection(),
    onSuccess: () => {
      toast.success("Conexión SMTP exitosa");
    },
    onError: (error: Error) => {
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
  client?: { name: string; email: string | null } | null;
}

export function useNotificationHistory(year?: number, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["notification-history", year, page, pageSize],
    queryFn: () => fetchNotificationHistory(year, page, pageSize),
  });
}

export function useNotificationHistoryYears() {
  return useQuery({
    queryKey: ["notification-history-years"],
    queryFn: fetchNotificationHistoryYears,
  });
}
