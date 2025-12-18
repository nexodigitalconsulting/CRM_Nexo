-- ============================================
-- MIGRACIÓN v1.4.0 - Sent Columns
-- Fecha: 2024-12-18
-- Descripción: Añadir columnas is_sent y sent_at a invoices, quotes, contracts
-- ============================================

DO $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
BEGIN
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] MIGRACIÓN v1.4.0 - Sent Columns', clock_timestamp();
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();

  -- Verificar si la migración ya fue aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.4.0') THEN
    RAISE NOTICE '[%] → v1.4.0 ya aplicada - omitiendo', clock_timestamp();
    RETURN;
  END IF;

  RAISE NOTICE '[%] Aplicando v1.4.0...', clock_timestamp();

  -- ═══════════════════════════════════════════
  -- TABLA: INVOICES
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%] Tabla INVOICES:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]   ✓ Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]   ✓ Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- TABLA: QUOTES
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%] Tabla QUOTES:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]   ✓ Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]   ✓ Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════
  -- TABLA: CONTRACTS
  -- ═══════════════════════════════════════════
  RAISE NOTICE '[%] Tabla CONTRACTS:', clock_timestamp();
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'is_sent'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN is_sent boolean DEFAULT false;
    RAISE NOTICE '[%]   ✓ Columna is_sent añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna is_sent ya existe', clock_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN sent_at timestamptz;
    RAISE NOTICE '[%]   ✓ Columna sent_at añadida', clock_timestamp();
  ELSE
    RAISE NOTICE '[%]   → Columna sent_at ya existe', clock_timestamp();
  END IF;

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.4.0', 'Columnas is_sent y sent_at en invoices, quotes, contracts', now());

  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
  RAISE NOTICE '[%] ✓ v1.4.0 aplicada correctamente', clock_timestamp();
  RAISE NOTICE '[%] Tiempo: % ms', clock_timestamp(), EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::integer;
  RAISE NOTICE '[%] ───────────────────────────────────────────', clock_timestamp();
END $$;

-- Verificación final
DO $$
DECLARE
  v_invoices_ok boolean;
  v_quotes_ok boolean;
  v_contracts_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_sent') INTO v_invoices_ok;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'is_sent') INTO v_quotes_ok;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'is_sent') INTO v_contracts_ok;

  RAISE NOTICE '[%] VERIFICACIÓN v1.4.0:', clock_timestamp();
  RAISE NOTICE '[%]   • invoices:  %', clock_timestamp(), CASE WHEN v_invoices_ok THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   • quotes:    %', clock_timestamp(), CASE WHEN v_quotes_ok THEN '✓' ELSE '✗' END;
  RAISE NOTICE '[%]   • contracts: %', clock_timestamp(), CASE WHEN v_contracts_ok THEN '✓' ELSE '✗' END;
END $$;
