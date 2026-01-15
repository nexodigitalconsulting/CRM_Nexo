-- ============================================
-- MIGRACIÓN v1.9.0 - Invoice IRPF Fields
-- Fecha: 2025-01-15
-- Descripción: Añadir campos IRPF a facturas
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();
  RAISE NOTICE '[%] MIGRACIÓN v1.9.0 - Invoice IRPF Fields', clock_timestamp();
  RAISE NOTICE '[%] ═══════════════════════════════════════════════════════', clock_timestamp();

  -- Verificar si ya está aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.9.0') THEN
    RAISE NOTICE '[%] → v1.9.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.9.0 - Invoice IRPF Fields...', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- INVOICES: Añadir columnas IRPF
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%]   Tabla INVOICES:', clock_timestamp();

  -- Añadir irpf_percent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'irpf_percent'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN irpf_percent NUMERIC(5,2) DEFAULT 0;
    RAISE NOTICE '[%]     • Columna irpf_percent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna irpf_percent ya existe', clock_timestamp();
  END IF;

  -- Añadir irpf_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'irpf_amount'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN irpf_amount NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE '[%]     • Columna irpf_amount añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]     → Columna irpf_amount ya existe', clock_timestamp();
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.9.0', 'Invoice IRPF fields (irpf_percent, irpf_amount)', now());

  RAISE NOTICE '[%] ✓ v1.9.0 aplicada correctamente', clock_timestamp();
END $$;
