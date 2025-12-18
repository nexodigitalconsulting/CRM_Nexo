-- Tabla para logs de correos enviados
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  attachment_count INTEGER DEFAULT 0,
  entity_type TEXT,
  entity_id UUID,
  provider TEXT NOT NULL DEFAULT 'smtp',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view all email logs"
ON public.email_logs FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view own email logs"
ON public.email_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- Tabla para configuración de Gmail OAuth
CREATE TABLE IF NOT EXISTS public.gmail_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  email_address TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Solo una configuración de Gmail
ALTER TABLE public.gmail_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gmail config"
ON public.gmail_config FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view gmail config"
ON public.gmail_config FOR SELECT
USING (has_any_role(auth.uid()));

-- Añadir columna provider a email_settings si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_settings' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.email_settings ADD COLUMN provider TEXT DEFAULT 'smtp';
  END IF;
END $$;

-- Registrar migración
INSERT INTO public.schema_versions (version, description)
VALUES ('v1.5.0', 'Email logs, Gmail OAuth config, provider selector')
ON CONFLICT DO NOTHING;