-- ============================================
-- APLICADOR DE MIGRACIONES - CRM
-- ============================================
-- Este script detecta y aplica todas las migraciones pendientes
-- de forma segura e idempotente.
--
-- USO: Ejecutar en Supabase SQL Editor o cliente PostgreSQL
-- ============================================

-- ============================================
-- PASO 0: CREAR TABLA DE VERSIONES (si no existe)
-- ============================================

CREATE TABLE IF NOT EXISTS schema_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL UNIQUE,
  description text,
  applied_at timestamptz DEFAULT now(),
  applied_by text DEFAULT current_user
);

-- Registrar versión base si no existe
INSERT INTO schema_versions (version, description, applied_at)
SELECT 'v1.0.0', 'Instalación base del schema CRM', now()
WHERE NOT EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.0.0');

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para verificar si una versión ya está aplicada
CREATE OR REPLACE FUNCTION is_version_applied(p_version text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM schema_versions WHERE version = p_version);
$$;

-- Función para obtener la versión actual
CREATE OR REPLACE FUNCTION get_current_schema_version()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;
$$;

-- ============================================
-- MIGRACIÓN v1.1.0 - PDF Settings
-- ============================================

DO $$
BEGIN
  IF is_version_applied('v1.1.0') THEN
    RAISE NOTICE '⏭️  v1.1.0 ya aplicada';
  ELSE
    -- Crear tabla pdf_settings
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

    -- Configuración por defecto
    INSERT INTO pdf_settings (id)
    SELECT gen_random_uuid()
    WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);

    -- Trigger updated_at
    DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
    CREATE TRIGGER update_pdf_settings_updated_at
      BEFORE UPDATE ON pdf_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Registrar
    INSERT INTO schema_versions (version, description)
    VALUES ('v1.1.0', 'Tabla pdf_settings para personalización de documentos');
    
    RAISE NOTICE '✅ v1.1.0 aplicada - pdf_settings creada';
  END IF;
END $$;

-- ============================================
-- MIGRACIÓN v1.2.0 - Email Signature
-- ============================================

DO $$
BEGIN
  IF is_version_applied('v1.2.0') THEN
    RAISE NOTICE '⏭️  v1.2.0 ya aplicada';
  ELSE
    -- Añadir columna signature_html
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_settings' 
      AND column_name = 'signature_html'
    ) THEN
      ALTER TABLE email_settings ADD COLUMN signature_html text;
    END IF;

    -- Registrar
    INSERT INTO schema_versions (version, description)
    VALUES ('v1.2.0', 'Columna signature_html en email_settings');
    
    RAISE NOTICE '✅ v1.2.0 aplicada - signature_html añadida';
  END IF;
END $$;

-- ============================================
-- RESUMEN DE MIGRACIONES
-- ============================================

DO $$
DECLARE
  v_count int;
  v_current text;
BEGIN
  SELECT COUNT(*) INTO v_count FROM schema_versions;
  SELECT get_current_schema_version() INTO v_current;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║        MIGRACIONES CRM - RESUMEN                  ║';
  RAISE NOTICE '╠═══════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Versión actual: %                         ║', RPAD(v_current, 8);
  RAISE NOTICE '║  Total migraciones: %                             ║', v_count;
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- Mostrar historial de versiones
SELECT 
  version,
  description,
  to_char(applied_at, 'YYYY-MM-DD HH24:MI') as applied_at
FROM schema_versions 
ORDER BY applied_at;
