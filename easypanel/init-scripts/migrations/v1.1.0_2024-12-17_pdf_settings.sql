-- ============================================
-- MIGRACIÓN v1.1.0 - Configuración de PDF
-- Fecha: 2024-12-17
-- Descripción: Añade tabla pdf_settings para personalizar documentos PDF
-- ============================================

-- Verificar si la migración ya fue aplicada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.1.0') THEN
    RAISE NOTICE 'Migración v1.1.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  -- Crear tabla pdf_settings si no existe
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

  -- Insertar configuración por defecto si la tabla está vacía
  INSERT INTO pdf_settings (id)
  SELECT gen_random_uuid()
  WHERE NOT EXISTS (SELECT 1 FROM pdf_settings LIMIT 1);

  -- Crear trigger para updated_at
  DROP TRIGGER IF EXISTS update_pdf_settings_updated_at ON pdf_settings;
  CREATE TRIGGER update_pdf_settings_updated_at
    BEFORE UPDATE ON pdf_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.1.0', 'Añade tabla pdf_settings para personalización de documentos', now());

  RAISE NOTICE '✅ Migración v1.1.0 aplicada correctamente';
END $$;
