-- Add sent tracking fields to quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;

-- Add sent tracking fields to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;

-- Add sent tracking fields to contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;

-- Create index for filtering unsent documents (for n8n/automation)
CREATE INDEX IF NOT EXISTS idx_quotes_unsent ON public.quotes(is_sent) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_invoices_unsent ON public.invoices(is_sent) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_contracts_unsent ON public.contracts(is_sent) WHERE is_sent = false;