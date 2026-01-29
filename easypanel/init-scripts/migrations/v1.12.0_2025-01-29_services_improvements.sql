-- ============================================
-- MIGRACIÓN v1.12.0 - Mejoras tabla services
-- Fecha: 2025-01-29
-- Descripción: 
--   1. Campo created_by para auditoría
--   2. Índices de rendimiento para services y tablas relacionadas
--   3. Función check_service_usage para validar eliminación
--   4. Trigger updated_at para services
-- ============================================

DO $$
BEGIN
  -- Verificar si ya está aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.12.0') THEN
    RAISE NOTICE 'Migración v1.12.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE '📦 Aplicando migración v1.12.0 - Mejoras tabla services...';

  -- ========================================
  -- 1. Campo created_by en services
  -- ========================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.services ADD COLUMN created_by uuid;
    RAISE NOTICE '  ✓ Campo created_by añadido a services';
  ELSE
    RAISE NOTICE '  · Campo created_by ya existe en services';
  END IF;

  -- ========================================
  -- 2. Índices de rendimiento
  -- ========================================
  
  -- Índice por status en services
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_services_status'
  ) THEN
    CREATE INDEX idx_services_status ON public.services(status);
    RAISE NOTICE '  ✓ Índice idx_services_status creado';
  ELSE
    RAISE NOTICE '  · Índice idx_services_status ya existe';
  END IF;

  -- Índice por category en services
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_services_category'
  ) THEN
    CREATE INDEX idx_services_category ON public.services(category);
    RAISE NOTICE '  ✓ Índice idx_services_category creado';
  ELSE
    RAISE NOTICE '  · Índice idx_services_category ya existe';
  END IF;

  -- Índice por service_id en invoice_services
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_invoice_services_service_id'
  ) THEN
    CREATE INDEX idx_invoice_services_service_id ON public.invoice_services(service_id);
    RAISE NOTICE '  ✓ Índice idx_invoice_services_service_id creado';
  ELSE
    RAISE NOTICE '  · Índice idx_invoice_services_service_id ya existe';
  END IF;

  -- Índice por service_id en quote_services
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_quote_services_service_id'
  ) THEN
    CREATE INDEX idx_quote_services_service_id ON public.quote_services(service_id);
    RAISE NOTICE '  ✓ Índice idx_quote_services_service_id creado';
  ELSE
    RAISE NOTICE '  · Índice idx_quote_services_service_id ya existe';
  END IF;

  -- Índice por service_id en contract_services
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_contract_services_service_id'
  ) THEN
    CREATE INDEX idx_contract_services_service_id ON public.contract_services(service_id);
    RAISE NOTICE '  ✓ Índice idx_contract_services_service_id creado';
  ELSE
    RAISE NOTICE '  · Índice idx_contract_services_service_id ya existe';
  END IF;

  -- ========================================
  -- 3. Función check_service_usage
  -- ========================================
  CREATE OR REPLACE FUNCTION public.check_service_usage(p_service_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $func$
    SELECT jsonb_build_object(
      'in_invoices', (SELECT COUNT(*) FROM invoice_services WHERE service_id = p_service_id),
      'in_quotes', (SELECT COUNT(*) FROM quote_services WHERE service_id = p_service_id),
      'in_contracts', (SELECT COUNT(*) FROM contract_services WHERE service_id = p_service_id),
      'can_delete', (
        NOT EXISTS (SELECT 1 FROM invoice_services WHERE service_id = p_service_id) AND
        NOT EXISTS (SELECT 1 FROM quote_services WHERE service_id = p_service_id) AND
        NOT EXISTS (SELECT 1 FROM contract_services WHERE service_id = p_service_id)
      )
    );
  $func$;
  RAISE NOTICE '  ✓ Función check_service_usage creada/actualizada';

  -- ========================================
  -- 4. Trigger updated_at para services
  -- ========================================
  DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
  CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  RAISE NOTICE '  ✓ Trigger update_services_updated_at creado';

  -- ========================================
  -- Registrar migración
  -- ========================================
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.12.0', 'Mejoras tabla services: campo created_by, índices, función check_usage, trigger updated_at', now());

  RAISE NOTICE '✅ Migración v1.12.0 aplicada correctamente';
END $$;
