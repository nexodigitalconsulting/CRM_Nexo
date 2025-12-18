import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmailLog {
  id: string;
  user_id: string | null;
  sender_email: string;
  sender_name: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_preview: string | null;
  attachments: { name: string; type: string; size?: number }[];
  attachment_count: number;
  entity_type: string | null;
  entity_id: string | null;
  provider: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

export function useEmailLogs() {
  return useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as EmailLog[];
    },
  });
}

export function useGmailConfig() {
  return useQuery({
    queryKey: ['gmail-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
