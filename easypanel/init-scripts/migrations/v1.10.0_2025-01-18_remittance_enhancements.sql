-- =============================================
-- Migración v1.10.0: Mejoras en Remesas SEPA
-- Fecha: 2025-01-18
-- Descripción: Añade funcionalidad completa para gestión de remesas
-- =============================================

-- 1. Nuevos estados para remesas
-- Nota: En PostgreSQL externo usar ALTER TYPE directamente
-- En Supabase Cloud, esto se hace vía migration

-- 2. Nuevos campos en remittances
ALTER TABLE remittances 
ADD COLUMN IF NOT EXISTS collection_date DATE,
ADD COLUMN IF NOT EXISTS sent_to_bank_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- 3. Campos SEPA en clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS bic TEXT,
ADD COLUMN IF NOT EXISTS sepa_mandate_id TEXT,
ADD COLUMN IF NOT EXISTS sepa_mandate_date DATE,
ADD COLUMN IF NOT EXISTS sepa_sequence_type TEXT DEFAULT 'RCUR';

-- 4. Campos SEPA en company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS sepa_creditor_id TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT;

-- 5. Tabla de pagos de remesa
CREATE TABLE IF NOT EXISTS remittance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remittance_id UUID NOT NULL REFERENCES remittances(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'cobrado' CHECK (status IN ('cobrado', 'devuelto', 'rechazado')),
    return_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID
);

-- 6. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_remittance_payments_remittance 
ON remittance_payments(remittance_id);

CREATE INDEX IF NOT EXISTS idx_remittance_payments_invoice 
ON remittance_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_remittance_id 
ON invoices(remittance_id);

CREATE INDEX IF NOT EXISTS idx_remittances_status 
ON remittances(status);

CREATE INDEX IF NOT EXISTS idx_remittances_collection_date 
ON remittances(collection_date);

-- 7. Comentarios de documentación
COMMENT ON TABLE remittance_payments IS 'Registro de pagos y devoluciones de remesas SEPA';
COMMENT ON COLUMN remittances.collection_date IS 'Fecha de cobro solicitada al banco';
COMMENT ON COLUMN remittances.sent_to_bank_at IS 'Timestamp de envío al banco';
COMMENT ON COLUMN remittances.paid_amount IS 'Importe total cobrado';
COMMENT ON COLUMN remittances.cancelled_at IS 'Timestamp de anulación';
COMMENT ON COLUMN remittances.cancelled_reason IS 'Motivo de anulación';
COMMENT ON COLUMN clients.bic IS 'Código BIC/SWIFT del banco del cliente';
COMMENT ON COLUMN clients.sepa_mandate_id IS 'Identificador del mandato SEPA';
COMMENT ON COLUMN clients.sepa_mandate_date IS 'Fecha de firma del mandato SEPA';
COMMENT ON COLUMN clients.sepa_sequence_type IS 'Tipo de secuencia SEPA (FRST, RCUR, OOFF, FNAL)';

-- 8. Registrar versión
INSERT INTO schema_versions (version, description)
VALUES ('1.10.0', 'Mejoras en remesas SEPA: campos, pagos, índices')
ON CONFLICT (version) DO NOTHING;
