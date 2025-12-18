-- ============================================
-- SCRIPT DE SINCRONIZACIÓN DE EMERGENCIA
-- Archivo: sync_to_latest.sql
-- Versión objetivo: v1.4.0
-- ============================================
-- Este script sincroniza CUALQUIER instalación a v1.4.0
-- - Detecta automáticamente qué componentes faltan
-- - Añade las columnas necesarias
-- - Registra todas las versiones en schema_versions
-- - Muestra logs detallados de cada paso
-- ============================================

DO $$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_current_version text;
  v_changes_made integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '[%] ╔═══════════════════════════════════════════════════════════════╗', clock_timestamp();
  RAISE NOTICE '[%] ║  SINCRONIZACIÓN DE EMERGENCIA - CRM v1.4.0                    ║', clock_timestamp();
  RAISE NOTICE '[%] ╚═══════════════════════════════════════════════════════════════╝', clock_timestamp();
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 1: Verificar/crear tabla schema_versions
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 1: Verificando tabla schema_versions...', clock_timestamp();
  
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
    RAISE NOTICE '[%]   ✓ Tabla schema_versions creada', clock_timestamp();
    v_changes_made := v_changes_made + 1;
  ELSE
    RAISE NOTICE '[%]   → Tabla schema_versions ya existe', clock_timestamp();
  END IF;

  -- Obtener versión actual
  SELECT COALESCE(
    (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
    'ninguna'
  ) INTO v_current_version;
  RAISE NOTICE '[%]   → Versión actual registrada: %', clock_timestamp(), v_current_version;

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 2: Habilitar RLS en schema_versions
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 2: Configurando RLS en schema_versions...', clock_timestamp();
  
  ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schema_versions' AND policyname = 'Anyone can read schema versions'
  ) THEN
    CREATE POLICY "Anyone can read schema versions" ON public.schema_versions FOR SELECT TO anon USING (true);
    RAISE NOTICE '[%]   ✓ Política anon creada', clock_timestamp();
    v_changes_made := v_changes_made + 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schema_versions' AND policyname = 'Authenticated users can read schema versions'
  ) THEN
    CREATE POLICY "Authenticated users can read schema versions" ON public.schema_versions FOR SELECT TO authenticated USING (true);
    RAISE NOTICE '[%]   ✓ Política authenticated creada', clock_timestamp();
    v_changes_made := v_changes_made + 1;
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 3: Verificar/añadir columnas en INVOICES
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 3: Verificando tabla INVOICES...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_sent'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN is_sent boolean DEFAULT false;
      RAISE NOTICE '[%]   ✓ invoices.is_sent añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → invoices.is_sent ya existe', clock_timestamp();
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'sent_at'
    ) THEN
      ALTER TABLE public.invoices ADD COLUMN sent_at timestamptz;
      RAISE NOTICE '[%]   ✓ invoices.sent_at añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → invoices.sent_at ya existe', clock_timestamp();
    END IF;
  ELSE
    RAISE NOTICE '[%]   ⚠ Tabla invoices no existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 4: Verificar/añadir columnas en QUOTES
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 4: Verificando tabla QUOTES...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'is_sent'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN is_sent boolean DEFAULT false;
      RAISE NOTICE '[%]   ✓ quotes.is_sent añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → quotes.is_sent ya existe', clock_timestamp();
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'sent_at'
    ) THEN
      ALTER TABLE public.quotes ADD COLUMN sent_at timestamptz;
      RAISE NOTICE '[%]   ✓ quotes.sent_at añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → quotes.sent_at ya existe', clock_timestamp();
    END IF;
  ELSE
    RAISE NOTICE '[%]   ⚠ Tabla quotes no existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 5: Verificar/añadir columnas en CONTRACTS
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 5: Verificando tabla CONTRACTS...', clock_timestamp();
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'is_sent'
    ) THEN
      ALTER TABLE public.contracts ADD COLUMN is_sent boolean DEFAULT false;
      RAISE NOTICE '[%]   ✓ contracts.is_sent añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → contracts.is_sent ya existe', clock_timestamp();
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'sent_at'
    ) THEN
      ALTER TABLE public.contracts ADD COLUMN sent_at timestamptz;
      RAISE NOTICE '[%]   ✓ contracts.sent_at añadida', clock_timestamp();
      v_changes_made := v_changes_made + 1;
    ELSE
      RAISE NOTICE '[%]   → contracts.sent_at ya existe', clock_timestamp();
    END IF;
  ELSE
    RAISE NOTICE '[%]   ⚠ Tabla contracts no existe', clock_timestamp();
  END IF;

  -- ═══════════════════════════════════════════════════════════════
  -- PASO 6: Registrar todas las versiones
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '[%] PASO 6: Registrando versiones en schema_versions...', clock_timestamp();
  
  INSERT INTO schema_versions (version, description, applied_at) VALUES
    ('v1.0.0', 'Schema base del CRM', now()),
    ('v1.1.0', 'Tabla pdf_settings para personalización de documentos', now()),
    ('v1.2.0', 'Columna signature_html en email_settings', now()),
    ('v1.3.0', 'RLS para schema_versions - lectura pública', now()),
    ('v1.4.0', 'Columnas is_sent y sent_at en invoices, quotes, contracts', now())
  ON CONFLICT (version) DO NOTHING;
  
  RAISE NOTICE '[%]   ✓ Versiones v1.0.0 - v1.4.0 registradas', clock_timestamp();

  -- ═══════════════════════════════════════════════════════════════
  -- RESUMEN FINAL
  -- ═══════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '[%] ╔═══════════════════════════════════════════════════════════════╗', clock_timestamp();
  RAISE NOTICE '[%] ║  SINCRONIZACIÓN COMPLETADA                                    ║', clock_timestamp();
  RAISE NOTICE '[%] ╠═══════════════════════════════════════════════════════════════╣', clock_timestamp();
  RAISE NOTICE '[%] ║  Cambios realizados: %                                        ║', clock_timestamp(), v_changes_made;
  RAISE NOTICE '[%] ║  Versión final: v1.4.0                                        ║', clock_timestamp();
  RAISE NOTICE '[%] ║  Tiempo: % ms                                                 ║', clock_timestamp(), EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::integer;
  RAISE NOTICE '[%] ╚═══════════════════════════════════════════════════════════════╝', clock_timestamp();
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_invoices_ok boolean;
  v_quotes_ok boolean;
  v_contracts_ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_sent') INTO v_invoices_ok;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'is_sent') INTO v_quotes_ok;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'is_sent') INTO v_contracts_ok;

  RAISE NOTICE '[%] VERIFICACIÓN DE COMPONENTES v1.4.0:', clock_timestamp();
  RAISE NOTICE '[%]   • invoices.is_sent/sent_at:  %', clock_timestamp(), CASE WHEN v_invoices_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '[%]   • quotes.is_sent/sent_at:    %', clock_timestamp(), CASE WHEN v_quotes_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '[%]   • contracts.is_sent/sent_at: %', clock_timestamp(), CASE WHEN v_contracts_ok THEN '✓ OK' ELSE '✗ FALTA' END;
  RAISE NOTICE '';
  
  IF v_invoices_ok AND v_quotes_ok AND v_contracts_ok THEN
    RAISE NOTICE '[%] ✅ SINCRONIZACIÓN EXITOSA - Sistema en v1.4.0', clock_timestamp();
  ELSE
    RAISE NOTICE '[%] ⚠️ SINCRONIZACIÓN PARCIAL - Revisar tablas faltantes', clock_timestamp();
  END IF;
END $$;

-- Mostrar historial de versiones
SELECT version, description, applied_at FROM schema_versions ORDER BY applied_at;
