-- Block G: campaign response tracking columns
ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "response_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "response_channel" text,
  ADD COLUMN IF NOT EXISTS "response_notes" text,
  ADD COLUMN IF NOT EXISTS "last_contact_at" timestamp with time zone;

-- Update default status to match UI expectations
-- (existing rows with "active" stay as-is; new rows default to "pendiente")
