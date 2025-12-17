-- Add signature_html column to email_settings
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS signature_html TEXT;