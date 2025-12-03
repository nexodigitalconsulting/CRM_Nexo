-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enable RLS on documents_rag (existing table)
ALTER TABLE public.documents_rag ENABLE ROW LEVEL SECURITY;

-- Create policy for documents_rag (allow authenticated users)
CREATE POLICY "Authenticated users can view documents_rag" ON public.documents_rag
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage documents_rag" ON public.documents_rag
  FOR ALL TO authenticated USING (true);