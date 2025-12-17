-- =====================================================
-- Migración: Crear infraestructura de versiones de schema
-- =====================================================

-- 1. Crear tabla schema_versions si no existe
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by TEXT DEFAULT current_user
);

-- 2. Habilitar RLS
ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

-- 3. Crear política de lectura para usuarios autenticados
DROP POLICY IF EXISTS "Users can read schema versions" ON public.schema_versions;
CREATE POLICY "Users can read schema versions" 
  ON public.schema_versions FOR SELECT 
  TO authenticated USING (true);

-- 4. Crear función get_current_schema_version
CREATE OR REPLACE FUNCTION public.get_current_schema_version()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1),
    'v0.0.0'
  );
$$;

-- 5. Crear función is_version_applied
CREATE OR REPLACE FUNCTION public.is_version_applied(check_version TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = check_version);
$$;

-- 6. Registrar versión actual (v1.2.0 ya que las tablas existen)
INSERT INTO public.schema_versions (version, description)
VALUES ('v1.2.0', 'Schema completo con productos, triggers y firma email')
ON CONFLICT (version) DO NOTHING;