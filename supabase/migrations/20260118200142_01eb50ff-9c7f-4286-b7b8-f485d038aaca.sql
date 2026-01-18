-- Add enhanced fields to remittances table
ALTER TABLE public.remittances
ADD COLUMN IF NOT EXISTS collection_date date,
ADD COLUMN IF NOT EXISTS sent_to_bank_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_reason text;

-- Add 'anulada' and 'enviada' to remittance_status enum
ALTER TYPE public.remittance_status ADD VALUE IF NOT EXISTS 'anulada';
ALTER TYPE public.remittance_status ADD VALUE IF NOT EXISTS 'enviada';
ALTER TYPE public.remittance_status ADD VALUE IF NOT EXISTS 'devuelta';

-- Add SEPA fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS bic text,
ADD COLUMN IF NOT EXISTS sepa_mandate_id text,
ADD COLUMN IF NOT EXISTS sepa_mandate_date date,
ADD COLUMN IF NOT EXISTS sepa_sequence_type text DEFAULT 'RCUR';

-- Add SEPA creditor fields to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS sepa_creditor_id text,
ADD COLUMN IF NOT EXISTS bic text;

-- Create remittance_payments table for tracking individual payments/returns
CREATE TABLE IF NOT EXISTS public.remittance_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remittance_id uuid NOT NULL REFERENCES public.remittances(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'cobrado' CHECK (status IN ('cobrado', 'devuelto', 'rechazado')),
  return_reason text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS on remittance_payments
ALTER TABLE public.remittance_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for remittance_payments (same as remittances)
CREATE POLICY "Authenticated users can view remittance_payments"
ON public.remittance_payments FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can insert remittance_payments"
ON public.remittance_payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update remittance_payments"
ON public.remittance_payments FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can delete remittance_payments"
ON public.remittance_payments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_remittance_payments_remittance_id ON public.remittance_payments(remittance_id);
CREATE INDEX IF NOT EXISTS idx_remittance_payments_invoice_id ON public.remittance_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_remittance_id ON public.invoices(remittance_id);

-- Update exportUtils columns for remittances - handled in code