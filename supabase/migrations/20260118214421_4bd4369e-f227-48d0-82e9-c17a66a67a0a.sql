-- Migration v1.11.0: Campaign and Contact Status Model Updates
-- ================================================================

-- 1. Create ENUM for campaign status
CREATE TYPE campaign_status AS ENUM (
  'pendiente',
  'enviado',
  'respondido',
  'descartado',
  'cliente'
);

-- 2. Add new columns to campaigns
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_channel TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;

-- 3. Remove current default on status before type conversion
ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;

-- 4. Migrate existing status values to new ENUM values
UPDATE campaigns SET status = 'pendiente' WHERE status = 'active' OR status IS NULL;
UPDATE campaigns SET status = 'enviado' WHERE status = 'scheduled';
UPDATE campaigns SET status = 'cliente' WHERE status = 'completed';

-- 5. Convert status column to campaign_status ENUM
ALTER TABLE campaigns 
  ALTER COLUMN status TYPE campaign_status 
  USING status::campaign_status;

-- 6. Set new default
ALTER TABLE campaigns 
  ALTER COLUMN status SET DEFAULT 'pendiente';

-- 7. Update contacts status ENUM
-- First, remove default and change column to TEXT temporarily
ALTER TABLE contacts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE contacts ALTER COLUMN status TYPE TEXT;

-- Map old values to new values
UPDATE contacts SET status = 'nuevo' WHERE status = 'nuevo' OR status IS NULL;
UPDATE contacts SET status = 'reunion_agendada' WHERE status = 'contactado';
UPDATE contacts SET status = 'propuesta_enviada' WHERE status = 'seguimiento';
UPDATE contacts SET status = 'ganado' WHERE status = 'convertido';
UPDATE contacts SET status = 'perdido' WHERE status = 'descartado';

-- Drop old ENUM and create new one
DROP TYPE IF EXISTS contact_status;

CREATE TYPE contact_status AS ENUM (
  'nuevo',
  'reunion_agendada',
  'propuesta_enviada',
  'ganado',
  'perdido'
);

-- Apply new ENUM to column
ALTER TABLE contacts 
  ALTER COLUMN status TYPE contact_status 
  USING status::contact_status;

ALTER TABLE contacts 
  ALTER COLUMN status SET DEFAULT 'nuevo';

-- 8. Add place_id to contacts for campaign linking
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS place_id TEXT;

-- 9. Create indexes for place_id lookups and performance
CREATE INDEX IF NOT EXISTS idx_contacts_place_id ON contacts(place_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_place_id ON campaigns(place_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_at ON campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_response_at ON campaigns(response_at);