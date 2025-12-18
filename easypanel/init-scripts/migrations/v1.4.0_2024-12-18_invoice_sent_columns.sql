-- ============================================
-- MIGRACIÓN v1.4.0 - Invoice Sent Columns
-- Fecha: 2024-12-18
-- Descripción: Añadir columnas is_sent y sent_at a invoices
-- ============================================

DO $$
BEGIN
  -- Verificar si la migración ya fue aplicada
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
