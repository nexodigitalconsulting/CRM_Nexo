// Migrado de Supabase a Drizzle - v2
import { useQuery } from "@tanstack/react-query";
import {
  fetchEmailLogs,
  fetchGmailConfig,
  type EmailLogRow,
  type GmailConfigRow,
} from "@/lib/api/email-logs";

export interface EmailLog extends EmailLogRow {
  attachments: { name: string; type: string; size?: number }[];
}

export function useEmailLogs() {
  return useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const data = await fetchEmailLogs();
      return data as unknown as EmailLog[];
    },
  });
}

export function useGmailConfig() {
  return useQuery({
    queryKey: ["gmail-config"],
    queryFn: fetchGmailConfig,
  });
}
