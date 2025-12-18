-- ============================================
-- APLICADOR INTELIGENTE DE MIGRACIONES
-- Archivo: apply_all.sql
-- Uso: Ejecutar en cualquier instalación para sincronizar a la última versión
-- IMPORTANTE: Este script NO depende de funciones previas
-- ============================================

-- ============================================
-- PASO 0: Crear tabla schema_versions si no existe
-- ============================================
DO $$
BEGIN
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
    RAISE NOTICE '✓ Tabla schema_versions creada';
  ELSE
    RAISE NOTICE '✓ Tabla schema_versions ya existe';
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

-- ============================================
-- PASO 2: Registrar v1.0.0 si no existe (base)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.0.0') THEN
    INSERT INTO schema_versions (version, description, applied_at)
    VALUES ('v1.0.0', 'Schema base del CRM', now());
    RAISE NOTICE '✓ Versión v1.0.0 registrada';
  ELSE
    RAISE NOTICE '→ v1.0.0 ya aplicada';
  END IF;
END $$;

-- ============================================
-- MIGRACIÓN v1.1.0 - PDF Settings
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.1.0') THEN
    RAISE NOTICE '→ v1.1.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE 'Aplicando v1.1.0 - PDF Settings...';

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

  -- Insert default row if empty
  INSERT INTO pdf_settings (id)
  SELECT gen_random_uuid()
  WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);

  -- Create trigger for updated_at (check if function exists first)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
    CREATE TRIGGER update_pdf_settings_updated_at
      BEFORE UPDATE ON pdf_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.1.0', 'Tabla pdf_settings para personalización de documentos', now());

  RAISE NOTICE '✓ v1.1.0 aplicada correctamente';
END $$;

-- ============================================
-- MIGRACIÓN v1.2.0 - Email Signature
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.2.0') THEN
    RAISE NOTICE '→ v1.2.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE 'Aplicando v1.2.0 - Email Signature...';

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
      RAISE NOTICE '  ✓ Columna signature_html añadida';
    ELSE
      RAISE NOTICE '  → Columna signature_html ya existe';
    END IF;
  ELSE
    RAISE NOTICE '  ⚠ Tabla email_settings no existe - omitiendo columna';
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.2.0', 'Columna signature_html en email_settings', now());

  RAISE NOTICE '✓ v1.2.0 aplicada correctamente';
END $$;

-- ============================================
-- MIGRACIÓN v1.3.0 - RLS para schema_versions
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.3.0') THEN
    RAISE NOTICE '→ v1.3.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE 'Aplicando v1.3.0 - RLS schema_versions...';

  -- Habilitar RLS si no está habilitado
  ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;

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
  END IF;

  -- Register migration
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.3.0', 'RLS para schema_versions - lectura pública', now());

  RAISE NOTICE '✓ v1.3.0 aplicada correctamente';
END $$;

-- ============================================
-- MIGRACIÓN v1.4.0 - Invoice Sent Columns
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.4.0') THEN
    RAISE NOTICE '→ v1.4.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE 'Aplicando v1.4.0 - Invoice Sent Columns...';

  -- Añadir columna is_sent si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '  ✓ Columna is_sent añadida';
  ELSE
    RAISE NOTICE '  → Columna is_sent ya existe';
  END IF;

  -- Añadir columna sent_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '  ✓ Columna sent_at añadida';
  ELSE
    RAISE NOTICE '  → Columna sent_at ya existe';
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.4.0', 'Columnas is_sent y sent_at en invoices', now());

  RAISE NOTICE '✓ v1.4.0 aplicada correctamente';
END $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
DO $$
DECLARE
  v_current text;
  v_count int;
BEGIN
  SELECT get_current_schema_version() INTO v_current;
  SELECT COUNT(*) INTO v_count FROM schema_versions;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Versión actual: %', v_current;
  RAISE NOTICE 'Total migraciones aplicadas: %', v_count;
  RAISE NOTICE '============================================';
END $$;

-- Show migration history
SELECT version, description, applied_at FROM schema_versions ORDER BY applied_at;
