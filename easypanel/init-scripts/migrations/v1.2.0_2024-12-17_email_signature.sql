-- ============================================
-- MIGRACIÓN v1.2.0 - Firma de Email
-- Fecha: 2024-12-17
-- Descripción: Añade columna signature_html a email_settings
-- ============================================

-- Verificar si la migración ya fue aplicada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.2.0') THEN
    RAISE NOTICE 'Migración v1.2.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  -- Añadir columna signature_html si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_settings' 
    AND column_name = 'signature_html'
  ) THEN
    ALTER TABLE email_settings ADD COLUMN signature_html text;
    RAISE NOTICE 'Columna signature_html añadida a email_settings';
  ELSE
    RAISE NOTICE 'Columna signature_html ya existe';
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.2.0', 'Añade columna signature_html a email_settings', now());

  RAISE NOTICE '✅ Migración v1.2.0 aplicada correctamente';
END $$;
