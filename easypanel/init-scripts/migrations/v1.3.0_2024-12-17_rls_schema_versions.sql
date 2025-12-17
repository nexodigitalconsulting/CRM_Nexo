-- =============================================================================
-- Migración v1.3.0: RLS para schema_versions (lectura pública)
-- Fecha: 2024-12-17
-- Descripción: Permite que usuarios anónimos y autenticados lean la versión del schema
-- =============================================================================

-- Verificar si ya está aplicada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.3.0') THEN
        RAISE NOTICE 'Migración v1.3.0 ya aplicada, saltando...';
        RETURN;
    END IF;

    -- Permitir lectura pública de schema_versions
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

    -- También permitir a usuarios autenticados
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

    -- Registrar versión
    INSERT INTO schema_versions (version, description)
    VALUES ('v1.3.0', 'RLS para schema_versions - lectura pública');

    RAISE NOTICE '✅ Migración v1.3.0 aplicada correctamente';
END $$;
