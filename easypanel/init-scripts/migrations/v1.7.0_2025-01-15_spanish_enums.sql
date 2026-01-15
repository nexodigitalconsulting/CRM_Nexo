-- ============================================
-- MIGRACIÓN v1.7.0 - Enums a Español
-- Fecha: 2025-01-15
-- Descripción: Migración de valores de enumerados a español
-- ============================================
-- Esta migración cambia los valores de los tipos ENUM del inglés al español
-- para mejor experiencia de usuario en la interfaz.
--
-- IMPORTANTE: Esta migración requiere recrear los tipos ENUM.
-- Los datos existentes serán convertidos automáticamente.
-- ============================================

DO $$
BEGIN
  -- Verificar si ya está aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'v1.7.0') THEN
    RAISE NOTICE 'Migración v1.7.0 ya aplicada - omitiendo';
    RETURN;
  END IF;

  RAISE NOTICE '[v1.7.0] Iniciando migración de enums a español...';

  -- ============================================
  -- 1. client_status: active/inactive -> activo/inactivo
  -- ============================================
  RAISE NOTICE '  → Migrando client_status...';
  
  -- Cambiar columnas a TEXT temporalmente
  ALTER TABLE clients ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  -- Actualizar valores
  UPDATE clients SET status = 'activo' WHERE status = 'active';
  UPDATE clients SET status = 'inactivo' WHERE status = 'inactive';
  
  -- Recrear el tipo ENUM
  DROP TYPE IF EXISTS client_status CASCADE;
  CREATE TYPE client_status AS ENUM ('activo', 'inactivo');
  
  -- Restaurar columna con nuevo tipo
  ALTER TABLE clients ALTER COLUMN status TYPE client_status USING status::client_status;
  ALTER TABLE clients ALTER COLUMN status SET DEFAULT 'activo';

  -- ============================================
  -- 2. client_segment: corporate/pyme/entrepreneur/individual -> corporativo/pyme/autonomo/particular
  -- ============================================
  RAISE NOTICE '  → Migrando client_segment...';
  
  ALTER TABLE clients ALTER COLUMN segment TYPE TEXT USING segment::TEXT;
  
  UPDATE clients SET segment = 'corporativo' WHERE segment = 'corporate';
  UPDATE clients SET segment = 'autonomo' WHERE segment = 'entrepreneur';
  UPDATE clients SET segment = 'particular' WHERE segment = 'individual';
  -- 'pyme' stays the same
  
  DROP TYPE IF EXISTS client_segment CASCADE;
  CREATE TYPE client_segment AS ENUM ('corporativo', 'pyme', 'autonomo', 'particular');
  
  ALTER TABLE clients ALTER COLUMN segment TYPE client_segment USING segment::client_segment;
  ALTER TABLE clients ALTER COLUMN segment SET DEFAULT 'pyme';

  -- ============================================
  -- 3. contact_status: new/contacted/follow_up/discarded/converted -> nuevo/contactado/seguimiento/descartado/convertido
  -- ============================================
  RAISE NOTICE '  → Migrando contact_status...';
  
  ALTER TABLE contacts ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE contacts SET status = 'nuevo' WHERE status = 'new';
  UPDATE contacts SET status = 'contactado' WHERE status = 'contacted';
  UPDATE contacts SET status = 'seguimiento' WHERE status = 'follow_up';
  UPDATE contacts SET status = 'descartado' WHERE status = 'discarded';
  UPDATE contacts SET status = 'convertido' WHERE status = 'converted';
  
  DROP TYPE IF EXISTS contact_status CASCADE;
  CREATE TYPE contact_status AS ENUM ('nuevo', 'contactado', 'seguimiento', 'descartado', 'convertido');
  
  ALTER TABLE contacts ALTER COLUMN status TYPE contact_status USING status::contact_status;
  ALTER TABLE contacts ALTER COLUMN status SET DEFAULT 'nuevo';

  -- ============================================
  -- 4. contract_status: active/expired/cancelled/pending_activation -> vigente/expirado/cancelado/pendiente_activacion
  -- ============================================
  RAISE NOTICE '  → Migrando contract_status...';
  
  ALTER TABLE contracts ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE contracts SET status = 'vigente' WHERE status = 'active';
  UPDATE contracts SET status = 'expirado' WHERE status = 'expired';
  UPDATE contracts SET status = 'cancelado' WHERE status = 'cancelled';
  UPDATE contracts SET status = 'pendiente_activacion' WHERE status = 'pending_activation';
  
  DROP TYPE IF EXISTS contract_status CASCADE;
  CREATE TYPE contract_status AS ENUM ('vigente', 'expirado', 'cancelado', 'pendiente_activacion');
  
  ALTER TABLE contracts ALTER COLUMN status TYPE contract_status USING status::contract_status;
  ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'pendiente_activacion';

  -- ============================================
  -- 5. billing_period: monthly/quarterly/annual/one_time/other -> mensual/trimestral/anual/unico/otro
  -- ============================================
  RAISE NOTICE '  → Migrando billing_period...';
  
  ALTER TABLE contracts ALTER COLUMN billing_period TYPE TEXT USING billing_period::TEXT;
  
  UPDATE contracts SET billing_period = 'mensual' WHERE billing_period = 'monthly';
  UPDATE contracts SET billing_period = 'trimestral' WHERE billing_period = 'quarterly';
  UPDATE contracts SET billing_period = 'anual' WHERE billing_period = 'annual';
  UPDATE contracts SET billing_period = 'unico' WHERE billing_period = 'one_time';
  UPDATE contracts SET billing_period = 'otro' WHERE billing_period = 'other';
  
  DROP TYPE IF EXISTS billing_period CASCADE;
  CREATE TYPE billing_period AS ENUM ('mensual', 'trimestral', 'anual', 'unico', 'otro');
  
  ALTER TABLE contracts ALTER COLUMN billing_period TYPE billing_period USING billing_period::billing_period;
  ALTER TABLE contracts ALTER COLUMN billing_period SET DEFAULT 'mensual';

  -- ============================================
  -- 6. payment_status: paid/pending/partial/claimed -> pagado/pendiente/parcial/reclamado
  -- ============================================
  RAISE NOTICE '  → Migrando payment_status...';
  
  ALTER TABLE contracts ALTER COLUMN payment_status TYPE TEXT USING payment_status::TEXT;
  
  UPDATE contracts SET payment_status = 'pagado' WHERE payment_status = 'paid';
  UPDATE contracts SET payment_status = 'pendiente' WHERE payment_status = 'pending';
  UPDATE contracts SET payment_status = 'parcial' WHERE payment_status = 'partial';
  UPDATE contracts SET payment_status = 'reclamado' WHERE payment_status = 'claimed';
  
  DROP TYPE IF EXISTS payment_status CASCADE;
  CREATE TYPE payment_status AS ENUM ('pagado', 'pendiente', 'parcial', 'reclamado');
  
  ALTER TABLE contracts ALTER COLUMN payment_status TYPE payment_status USING payment_status::payment_status;
  ALTER TABLE contracts ALTER COLUMN payment_status SET DEFAULT 'pendiente';

  -- ============================================
  -- 7. quote_status: draft/sent/approved/rejected -> borrador/enviado/aceptado/rechazado
  -- ============================================
  RAISE NOTICE '  → Migrando quote_status...';
  
  ALTER TABLE quotes ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE quotes SET status = 'borrador' WHERE status = 'draft';
  UPDATE quotes SET status = 'enviado' WHERE status = 'sent';
  UPDATE quotes SET status = 'aceptado' WHERE status = 'approved';
  UPDATE quotes SET status = 'rechazado' WHERE status = 'rejected';
  
  DROP TYPE IF EXISTS quote_status CASCADE;
  CREATE TYPE quote_status AS ENUM ('borrador', 'enviado', 'aceptado', 'rechazado');
  
  ALTER TABLE quotes ALTER COLUMN status TYPE quote_status USING status::quote_status;
  ALTER TABLE quotes ALTER COLUMN status SET DEFAULT 'borrador';

  -- ============================================
  -- 8. invoice_status: draft/issued/paid/cancelled -> borrador/emitida/pagada/cancelada
  -- ============================================
  RAISE NOTICE '  → Migrando invoice_status...';
  
  ALTER TABLE invoices ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE invoices SET status = 'borrador' WHERE status = 'draft';
  UPDATE invoices SET status = 'emitida' WHERE status = 'issued';
  UPDATE invoices SET status = 'pagada' WHERE status = 'paid';
  UPDATE invoices SET status = 'cancelada' WHERE status = 'cancelled';
  
  DROP TYPE IF EXISTS invoice_status CASCADE;
  CREATE TYPE invoice_status AS ENUM ('borrador', 'emitida', 'pagada', 'cancelada');
  
  ALTER TABLE invoices ALTER COLUMN status TYPE invoice_status USING status::invoice_status;
  ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'borrador';

  -- ============================================
  -- 9. remittance_status: pending/paid/partial/overdue -> pendiente/cobrada/parcial/vencida
  -- ============================================
  RAISE NOTICE '  → Migrando remittance_status...';
  
  ALTER TABLE remittances ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE remittances SET status = 'pendiente' WHERE status = 'pending';
  UPDATE remittances SET status = 'cobrada' WHERE status = 'paid';
  UPDATE remittances SET status = 'parcial' WHERE status = 'partial';
  UPDATE remittances SET status = 'vencida' WHERE status = 'overdue';
  
  DROP TYPE IF EXISTS remittance_status CASCADE;
  CREATE TYPE remittance_status AS ENUM ('pendiente', 'cobrada', 'parcial', 'vencida');
  
  ALTER TABLE remittances ALTER COLUMN status TYPE remittance_status USING status::remittance_status;
  ALTER TABLE remittances ALTER COLUMN status SET DEFAULT 'pendiente';

  -- ============================================
  -- 10. service_status: active/inactive/development -> activo/inactivo/desarrollo
  -- ============================================
  RAISE NOTICE '  → Migrando service_status...';
  
  ALTER TABLE services ALTER COLUMN status TYPE TEXT USING status::TEXT;
  
  UPDATE services SET status = 'activo' WHERE status = 'active';
  UPDATE services SET status = 'inactivo' WHERE status = 'inactive';
  UPDATE services SET status = 'desarrollo' WHERE status = 'development';
  
  DROP TYPE IF EXISTS service_status CASCADE;
  CREATE TYPE service_status AS ENUM ('activo', 'inactivo', 'desarrollo');
  
  ALTER TABLE services ALTER COLUMN status TYPE service_status USING status::service_status;
  ALTER TABLE services ALTER COLUMN status SET DEFAULT 'activo';

  -- ============================================
  -- 11. event_importance: high/medium/low -> alta/media/baja
  -- ============================================
  RAISE NOTICE '  → Migrando event_importance...';
  
  -- Actualizar calendar_events
  ALTER TABLE calendar_events ALTER COLUMN importance TYPE TEXT USING importance::TEXT;
  UPDATE calendar_events SET importance = 'alta' WHERE importance = 'high';
  UPDATE calendar_events SET importance = 'media' WHERE importance = 'medium';
  UPDATE calendar_events SET importance = 'baja' WHERE importance = 'low';
  
  -- Actualizar calendar_categories
  ALTER TABLE calendar_categories ALTER COLUMN importance TYPE TEXT USING importance::TEXT;
  UPDATE calendar_categories SET importance = 'alta' WHERE importance = 'high';
  UPDATE calendar_categories SET importance = 'media' WHERE importance = 'medium';
  UPDATE calendar_categories SET importance = 'baja' WHERE importance = 'low';
  
  DROP TYPE IF EXISTS event_importance CASCADE;
  CREATE TYPE event_importance AS ENUM ('alta', 'media', 'baja');
  
  ALTER TABLE calendar_events ALTER COLUMN importance TYPE event_importance USING importance::event_importance;
  ALTER TABLE calendar_events ALTER COLUMN importance SET DEFAULT 'media';
  
  ALTER TABLE calendar_categories ALTER COLUMN importance TYPE event_importance USING importance::event_importance;
  ALTER TABLE calendar_categories ALTER COLUMN importance SET DEFAULT 'media';

  -- ============================================
  -- Registrar migración
  -- ============================================
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('v1.7.0', 'Migración de enums a español', now());

  RAISE NOTICE '✅ Migración v1.7.0 aplicada correctamente - Enums en español';

END $$;
