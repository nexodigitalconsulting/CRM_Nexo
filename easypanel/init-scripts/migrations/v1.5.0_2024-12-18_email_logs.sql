-- ============================================
-- MIGRACIÓN v1.5.0 - Email Logs & Gmail OAuth
-- Fecha: 2024-12-18
-- Descripción: Tabla email_logs para historial de emails,
--              tabla gmail_config para OAuth Gmail,
--              y columna provider en email_settings
-- ============================================

DO $$
BEGIN
  -- Verificar si ya está aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.5.0') THEN
    RAISE NOTICE 'Migración v1.5.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.5.0 - Email Logs & Gmail OAuth...', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- TABLA email_logs
  -- ═══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    sender_email text NOT NULL,
    sender_name text,
    recipient_email text NOT NULL,
    recipient_name text,
    subject text NOT NULL,
    body_preview text,
    attachments jsonb DEFAULT '[]',
    attachment_count integer DEFAULT 0,
    entity_type text,
    entity_id uuid,
    provider text NOT NULL DEFAULT 'smtp',
    status text NOT NULL DEFAULT 'sent',
    error_message text,
    sent_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  RAISE NOTICE '[%]   • Tabla email_logs creada', clock_timestamp();

  -- Índices para email_logs
  CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_email_logs_entity ON email_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
  RAISE NOTICE '[%]   • Índices de email_logs creados', clock_timestamp();

  -- RLS para email_logs
  ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

  -- Política: Admins y managers pueden ver todos los logs
  CREATE POLICY "Admins and managers can view all email logs" 
    ON public.email_logs 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

  -- Política: Usuarios pueden ver sus propios logs
  CREATE POLICY "Users can view own email logs" 
    ON public.email_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);

  -- Política: Sistema puede insertar logs
  CREATE POLICY "System can insert email logs" 
    ON public.email_logs 
    FOR INSERT 
    WITH CHECK (true);

  RAISE NOTICE '[%]   • Políticas RLS de email_logs creadas', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- TABLA gmail_config
  -- ═══════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS public.gmail_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    access_token text,
    refresh_token text,
    token_expiry timestamptz,
    email_address text,
    is_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  RAISE NOTICE '[%]   • Tabla gmail_config creada', clock_timestamp();

  -- Trigger updated_at para gmail_config
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_gmail_config_updated_at ON gmail_config;
    CREATE TRIGGER update_gmail_config_updated_at
      BEFORE UPDATE ON gmail_config
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '[%]   • Trigger updated_at para gmail_config creado', clock_timestamp();
  END IF;

  -- RLS para gmail_config
  ALTER TABLE public.gmail_config ENABLE ROW LEVEL SECURITY;

  -- Política: Solo admins pueden gestionar gmail_config
  CREATE POLICY "Admins can manage gmail config" 
    ON public.gmail_config 
    FOR ALL 
    USING (has_role(auth.uid(), 'admin'));

  -- Política: Usuarios autenticados pueden ver gmail_config
  CREATE POLICY "Authenticated users can view gmail config" 
    ON public.gmail_config 
    FOR SELECT 
    USING (has_any_role(auth.uid()));

  RAISE NOTICE '[%]   • Políticas RLS de gmail_config creadas', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- COLUMNA provider EN email_settings
  -- ═══════════════════════════════════════════
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'email_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_settings' 
      AND column_name = 'provider'
    ) THEN
      ALTER TABLE email_settings ADD COLUMN provider text DEFAULT 'smtp';
      RAISE NOTICE '[%]   • Columna provider añadida a email_settings', clock_timestamp();
    ELSE
      RAISE NOTICE '[%]   → Columna provider ya existe en email_settings', clock_timestamp();
    END IF;
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.5.0', 'Email logs, Gmail OAuth config, provider selector', now());

  RAISE NOTICE '[%] ✓ Migración v1.5.0 aplicada correctamente', clock_timestamp();
END $$;
