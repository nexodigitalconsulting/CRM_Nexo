-- =============================================
-- Migración v1.11.0: Modelo de Estados para Campañas y Contactos
-- Fecha: 2025-01-19
-- Descripción: Nuevos ENUMs y campos para gestión de estados de campañas y contactos
-- =============================================

-- 1. Crear ENUM campaign_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM (
      'pendiente',
      'enviado',
      'respondido',
      'descartado',
      'cliente'
    );
    RAISE NOTICE '  • ENUM campaign_status creado';
  ELSE
    RAISE NOTICE '  → ENUM campaign_status ya existe';
  END IF;
END $$;

-- 2. Añadir nuevas columnas a campaigns
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_channel TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- 3. Convertir columna status a campaign_status ENUM
DO $$
BEGIN
  -- Solo si la columna no es ya del tipo campaign_status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' 
    AND column_name = 'status' 
    AND data_type = 'text'
  ) THEN
    -- Quitar default
    ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;
    
    -- Migrar valores existentes
    UPDATE campaigns SET status = 'pendiente' WHERE status IN ('active', 'draft') OR status IS NULL;
    UPDATE campaigns SET status = 'enviado' WHERE status = 'scheduled';
    UPDATE campaigns SET status = 'cliente' WHERE status = 'completed';
    
    -- Convertir tipo
    ALTER TABLE campaigns 
      ALTER COLUMN status TYPE campaign_status 
      USING status::campaign_status;
    
    -- Nuevo default
    ALTER TABLE campaigns 
      ALTER COLUMN status SET DEFAULT 'pendiente';
    
    RAISE NOTICE '  • Columna campaigns.status convertida a ENUM';
  ELSE
    RAISE NOTICE '  → Columna campaigns.status ya es ENUM';
  END IF;
END $$;

-- 4. Actualizar ENUM contact_status
DO $$
DECLARE
  v_has_old_values boolean;
BEGIN
  -- Verificar si tiene los valores antiguos
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'contact_status' AND e.enumlabel = 'contactado'
  ) INTO v_has_old_values;
  
  IF v_has_old_values THEN
    -- Quitar default y convertir a TEXT
    ALTER TABLE contacts ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE contacts ALTER COLUMN status TYPE TEXT;
    
    -- Migrar valores
    UPDATE contacts SET status = 'nuevo' WHERE status = 'nuevo' OR status IS NULL;
    UPDATE contacts SET status = 'reunion_agendada' WHERE status = 'contactado';
    UPDATE contacts SET status = 'propuesta_enviada' WHERE status = 'seguimiento';
    UPDATE contacts SET status = 'ganado' WHERE status = 'convertido';
    UPDATE contacts SET status = 'perdido' WHERE status = 'descartado';
    
    -- Drop y recrear ENUM
    DROP TYPE IF EXISTS contact_status;
    
    CREATE TYPE contact_status AS ENUM (
      'nuevo',
      'reunion_agendada',
      'propuesta_enviada',
      'ganado',
      'perdido'
    );
    
    -- Aplicar ENUM
    ALTER TABLE contacts 
      ALTER COLUMN status TYPE contact_status 
      USING status::contact_status;
    
    ALTER TABLE contacts 
      ALTER COLUMN status SET DEFAULT 'nuevo';
    
    RAISE NOTICE '  • ENUM contact_status actualizado con nuevos valores';
  ELSE
    RAISE NOTICE '  → ENUM contact_status ya tiene valores actuales';
  END IF;
END $$;

-- 5. Añadir place_id a contacts para vincular con campañas
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS place_id TEXT;

-- 6. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_contacts_place_id ON contacts(place_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_place_id ON campaigns(place_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_at ON campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_response_at ON campaigns(response_at);

-- 7. Comentarios de documentación
COMMENT ON COLUMN campaigns.sent_at IS 'Fecha de envío de la campaña';
COMMENT ON COLUMN campaigns.response_at IS 'Fecha de respuesta del lead';
COMMENT ON COLUMN campaigns.response_channel IS 'Canal por el que respondió (email, teléfono, web, etc.)';
COMMENT ON COLUMN campaigns.last_contact_at IS 'Última fecha de contacto con el lead';
COMMENT ON COLUMN contacts.place_id IS 'ID de Google Places para vincular con campañas';

-- 8. Registrar versión
INSERT INTO schema_versions (version, description)
VALUES ('v1.11.0', 'Modelo de estados para campañas y contactos: ENUMs, campos y índices')
ON CONFLICT (version) DO NOTHING;
