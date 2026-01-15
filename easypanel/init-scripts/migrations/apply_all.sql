-- ============================================
-- APLICADOR INTELIGENTE DE MIGRACIONES v1.6.0
-- Archivo: apply_all.sql
-- Uso: Ejecutar en cualquier instalación para sincronizar a la última versión
-- IMPORTANTE: Este script NO depende de funciones previas
-- ============================================
-- Sistema de logs: Cada paso muestra timestamp y estado
-- ============================================

-- ============================================
-- PASO 0: Crear tabla schema_versions si no existe
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] APLICADOR DE MIGRACIONES CRM - Iniciando...', clock_timestamp();
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  
  -- Check if table exists using information_schema (no dependencies)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'schema_versions'
  ) THEN
    CREATE TABLE schema_versions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      version text NOT NULL UNIQUE,
      description text,
      applied_at timestamptz DEFAULT now(),
      applied_by text DEFAULT current_user
    );
    RAISE NOTICE '[%] ✓ Tabla schema_versions creada', clock_timestamp();
  ELSE
    RAISE NOTICE '[%] → Tabla schema_versions ya existe', clock_timestamp();
  END IF;
END $$;

-- ============================================
-- PASO 1: Crear funciones auxiliares
-- ============================================
CREATE OR REPLACE FUNCTION is_version_applied(p_version text)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = p_version);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_schema_version()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
    'v0.0.0'
  );
$$ LANGUAGE sql STABLE;

DO $$
BEGIN
  RAISE NOTICE '[%] ✓ Funciones auxiliares creadas', clock_timestamp();
END $$;

-- ============================================
-- PASO 2: Registrar v1.0.0 si no existe (base)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.0.0 (Schema base)...', clock_timestamp();
  
  IF NOT EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.0.0') THEN
    INSERT INTO schema_versions (version, description, applied_at)
    VALUES ('v1.0.0', 'Schema base del CRM', now());
    RAISE NOTICE '[%] ✓ v1.0.0 registrada', clock_timestamp();
  ELSE
    RAISE NOTICE '[%] → v1.0.0 ya aplicada - omitiendo', clock_timestamp();
  END IF;
END $$;

-- ============================================
-- MIGRACIÓN v1.1.0 - PDF Settings
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.1.0 (PDF Settings)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.1.0') THEN
    RAISE NOTICE '[%] → v1.1.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.1.0 - PDF Settings...', clock_timestamp();

  -- Create pdf_settings table
  CREATE TABLE IF NOT EXISTS pdf_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    primary_color text DEFAULT '#3366cc',
    secondary_color text DEFAULT '#666666',
    accent_color text DEFAULT '#0066cc',
    show_logo boolean DEFAULT true,
    logo_position text DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
    show_iban_footer boolean DEFAULT true,
    show_notes boolean DEFAULT true,
    show_discounts_column boolean DEFAULT true,
    header_style text DEFAULT 'classic' CHECK (header_style IN ('classic', 'modern', 'minimal')),
    font_size_base integer DEFAULT 10 CHECK (font_size_base BETWEEN 8 AND 14),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  RAISE NOTICE '[%]   • Tabla pdf_settings verificada', clock_timestamp();

  -- Insert default row if empty
  INSERT INTO pdf_settings (id)
  SELECT gen_random_uuid()
  WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);
  RAISE NOTICE '[%]   • Datos por defecto insertados', clock_timestamp();

  -- Create trigger for updated_at (check if function exists first)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
    CREATE TRIGGER update_pdf_settings_updated_at
      BEFORE UPDATE ON pdf_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '[%]   • Trigger updated_at creado', clock_timestamp();
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.1.0', 'Tabla pdf_settings para personalización de documentos', now());

  RAISE NOTICE '[%] ✓ v1.1.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.2.0 - Email Signature
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.2.0 (Email Signature)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.2.0') THEN
    RAISE NOTICE '[%] → v1.2.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.2.0 - Email Signature...', clock_timestamp();

  -- Add signature_html column if table exists and column doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'email_settings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_settings' 
      AND column_name = 'signature_html'
    ) THEN
      ALTER TABLE email_settings ADD COLUMN signature_html text;
      RAISE NOTICE '[%]   • Columna signature_html añadida', clock_timestamp();
    ELSE
      RAISE NOTICE '[%]   → Columna signature_html ya existe', clock_timestamp();
    END IF;
  ELSE
    RAISE NOTICE '[%]   ⚠ Tabla email_settings no existe - omitiendo columna', clock_timestamp();
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.2.0', 'Columna signature_html en email_settings', now());

  RAISE NOTICE '[%] ✓ v1.2.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.3.0 - RLS para schema_versions
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.3.0 (RLS schema_versions)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.3.0') THEN
    RAISE NOTICE '[%] → v1.3.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.3.0 - RLS schema_versions...', clock_timestamp();

  -- Habilitar RLS si no está habilitado
  ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '[%]   • RLS habilitado en schema_versions', clock_timestamp();

  -- Política para anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schema_versions' 
    AND policyname = 'Anyone can read schema versions'
  ) THEN
    CREATE POLICY "Anyone can read schema versions" 
      ON public.schema_versions 
      FOR SELECT 
      TO anon 
      USING (true);
    RAISE NOTICE '[%]   • Política anon creada', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Política anon ya existe', clock_timestamp();
  END IF;

  -- Política para authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schema_versions' 
    AND policyname = 'Authenticated users can read schema versions'
  ) THEN
    CREATE POLICY "Authenticated users can read schema versions" 
      ON public.schema_versions 
      FOR SELECT 
      TO authenticated 
      USING (true);
    RAISE NOTICE '[%]   • Política authenticated creada', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Política authenticated ya existe', clock_timestamp();
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.3.0', 'RLS para schema_versions - lectura pública', now());

  RAISE NOTICE '[%] ✓ v1.3.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.4.0 - Sent Columns (invoices, quotes, contracts)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.4.0 (Sent Columns)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.4.0') THEN
    RAISE NOTICE '[%] → v1.4.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.4.0 - Sent Columns (invoices, quotes, contracts)...', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- INVOICES
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%]   Tabla INVOICES:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]     • Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]     • Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- QUOTES
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%]   Tabla QUOTES:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]     • Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]     • Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- CONTRACTS
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%]   Tabla CONTRACTS:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]     • Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]     • Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.4.0', 'Columnas is_sent y sent_at en invoices, quotes, contracts', now());

  RAISE NOTICE '[%] ✓ v1.4.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.5.0 - Email Logs & Gmail OAuth
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.5.0 (Email Logs & Gmail OAuth)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.5.0') THEN
    RAISE NOTICE '[%] → v1.5.0 ya aplicada - omitiendo', clock_timestamp();
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

  -- Políticas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Admins and managers can view all email logs') THEN
    CREATE POLICY "Admins and managers can view all email logs" 
      ON public.email_logs FOR SELECT 
      USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Users can view own email logs') THEN
    CREATE POLICY "Users can view own email logs" 
      ON public.email_logs FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'System can insert email logs') THEN
    CREATE POLICY "System can insert email logs" 
      ON public.email_logs FOR INSERT 
      WITH CHECK (true);
  END IF;

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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gmail_config' AND policyname = 'Admins can manage gmail config') THEN
    CREATE POLICY "Admins can manage gmail config" 
      ON public.gmail_config FOR ALL 
      USING (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gmail_config' AND policyname = 'Authenticated users can view gmail config') THEN
    CREATE POLICY "Authenticated users can view gmail config" 
      ON public.gmail_config FOR SELECT 
      USING (has_any_role(auth.uid()));
  END IF;

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

  RAISE NOTICE '[%] ✓ v1.5.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.6.0 - Expenses Improvements
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] Verificando v1.6.0 (Expenses Improvements)...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.6.0') THEN
    RAISE NOTICE '[%] → v1.6.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.6.0 - Expenses Improvements...', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- Cambiar expense_number de integer a text
  -- ═══════════════════════════════════════════
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'expenses' 
    AND column_name = 'expense_number'
    AND data_type = 'integer'
  ) THEN
    -- Convertir a text
    ALTER TABLE public.expenses ALTER COLUMN expense_number TYPE text USING expense_number::text;
    -- Eliminar default de secuencia
    ALTER TABLE public.expenses ALTER COLUMN expense_number DROP DEFAULT;
    RAISE NOTICE '[%]   • expense_number convertido a text', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → expense_number ya es text o no existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- Añadir columna id_factura
  -- ═══════════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'expenses' 
    AND column_name = 'id_factura'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN id_factura text;
    RAISE NOTICE '[%]   • Columna id_factura añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna id_factura ya existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- Añadir constraint UNIQUE en expense_number
  -- ═══════════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'expenses_expense_number_unique' 
    OR conname = 'expenses_expense_number_key'
  ) THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_expense_number_unique UNIQUE (expense_number);
    RAISE NOTICE '[%]   • Constraint UNIQUE añadido a expense_number', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Constraint UNIQUE ya existe', clock_timestamp();
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.6.0', 'Expenses: expense_number text unique, id_factura', now());

  RAISE NOTICE '[%] ✓ v1.6.0 aplicada correctamente', clock_timestamp();
END $$;

-- ============================================
-- MIGRACIÓN v1.7.0 - Enums a Español
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.7.0') THEN
    RAISE NOTICE '[%] v1.7.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.7.0 - Enums a español...', clock_timestamp();
  
  -- NOTA: Esta migración solo registra la versión si los enums ya están en español.
  -- Si los enums están en inglés, deben migrarse manualmente con el archivo:
  -- easypanel/init-scripts/migrations/v1.7.0_2025-01-15_spanish_enums.sql
  
  -- Verificar si ya están en español (verificamos un enum representativo)
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'client_status' AND e.enumlabel = 'activo'
  ) THEN
    -- Ya están en español, solo registrar
    INSERT INTO schema_versions (version, description, applied_at)
    VALUES ('v1.7.0', 'Enums en español (ya aplicado)', now());
    RAISE NOTICE '[%] ✓ v1.7.0 registrada - enums ya en español', clock_timestamp();
  ELSE
    RAISE NOTICE '[%] ⚠️ Enums aún en inglés - ejecutar v1.7.0_2025-01-15_spanish_enums.sql manualmente', clock_timestamp();
  END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL DE COMPONENTES v1.7.0
-- ============================================
DO $$
DECLARE
  v_current text;
  v_count int;
  v_email_logs boolean;
  v_gmail_config boolean;
  v_provider_col boolean;
  v_invoices_is_sent boolean;
  v_quotes_is_sent boolean;
  v_contracts_is_sent boolean;
  v_expense_number_text boolean;
  v_id_factura boolean;
  v_expense_unique boolean;
  v_enums_spanish boolean;
  v_all_ok boolean;
BEGIN
  SELECT get_current_schema_version() INTO v_current;
  SELECT COUNT(*) INTO v_count FROM schema_versions;
  
  -- Verificar componentes v1.5.0
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs') INTO v_email_logs;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gmail_config') INTO v_gmail_config;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_settings' AND column_name = 'provider') INTO v_provider_col;
  
  -- Verificar componentes v1.4.0
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_sent') INTO v_invoices_is_sent;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'is_sent') INTO v_quotes_is_sent;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'is_sent') INTO v_contracts_is_sent;
  
  -- Verificar componentes v1.6.0
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expense_number' AND data_type = 'text') INTO v_expense_number_text;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'id_factura') INTO v_id_factura;
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('expenses_expense_number_unique', 'expenses_expense_number_key')) INTO v_expense_unique;
  
  -- Verificar v1.7.0: enums en español
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'client_status' AND e.enumlabel = 'activo'
  ) INTO v_enums_spanish;
  
  v_all_ok := v_email_logs AND v_gmail_config AND v_provider_col AND v_invoices_is_sent AND v_quotes_is_sent AND v_contracts_is_sent AND v_expense_number_text AND v_id_factura AND v_expense_unique AND v_enums_spanish;
  
  RAISE NOTICE '';
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] MIGRACIÓN COMPLETADA', clock_timestamp();
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] Versión actual: %', clock_timestamp(), v_current;
  RAISE NOTICE '[%] Total migraciones aplicadas: %', clock_timestamp(), v_count;
  RAISE NOTICE '';
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] VERIFICACIÓN COMPONENTES', clock_timestamp();
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] v1.4.0:', clock_timestamp();
  RAISE NOTICE '[%]   invoices.is_sent:     %', clock_timestamp(), CASE WHEN v_invoices_is_sent THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   quotes.is_sent:       %', clock_timestamp(), CASE WHEN v_quotes_is_sent THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   contracts.is_sent:    %', clock_timestamp(), CASE WHEN v_contracts_is_sent THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%] v1.5.0:', clock_timestamp();
  RAISE NOTICE '[%]   email_logs tabla:     %', clock_timestamp(), CASE WHEN v_email_logs THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   gmail_config tabla:   %', clock_timestamp(), CASE WHEN v_gmail_config THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   email_settings.provider: %', clock_timestamp(), CASE WHEN v_provider_col THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%] v1.6.0:', clock_timestamp();
  RAISE NOTICE '[%]   expenses.expense_number text: %', clock_timestamp(), CASE WHEN v_expense_number_text THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   expenses.id_factura:   %', clock_timestamp(), CASE WHEN v_id_factura THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   expenses UNIQUE constraint: %', clock_timestamp(), CASE WHEN v_expense_unique THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%] v1.7.0:', clock_timestamp();
  RAISE NOTICE '[%]   Enums en español:     %', clock_timestamp(), CASE WHEN v_enums_spanish THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] ESTADO FINAL: %', clock_timestamp(), CASE WHEN v_all_ok THEN '✅ TODOS LOS COMPONENTES OK' ELSE '⚠️ FALTAN COMPONENTES' END;
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
END $$;

-- Show migration history
SELECT version, description, applied_at FROM schema_versions ORDER BY applied_at;
