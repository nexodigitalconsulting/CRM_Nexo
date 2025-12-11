-- Create table for invoice product analysis
CREATE TABLE public.invoice_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number INTEGER NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_status TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  client_name TEXT NOT NULL,
  client_cif TEXT,
  service_id UUID NOT NULL REFERENCES public.services(id),
  service_name TEXT NOT NULL,
  service_category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  iva_percent NUMERIC DEFAULT 21,
  iva_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for quote product analysis
CREATE TABLE public.quote_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_number INTEGER NOT NULL,
  quote_date DATE NOT NULL,
  quote_status TEXT,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT,
  contact_id UUID REFERENCES public.contacts(id),
  contact_name TEXT,
  service_id UUID NOT NULL REFERENCES public.services(id),
  service_name TEXT NOT NULL,
  service_category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  iva_percent NUMERIC DEFAULT 21,
  iva_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_products
CREATE POLICY "Authenticated users can view invoice_products"
ON public.invoice_products FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoice_products"
ON public.invoice_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'user'::app_role));

-- RLS policies for quote_products
CREATE POLICY "Authenticated users can view quote_products"
ON public.quote_products FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Users can manage quote_products"
ON public.quote_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'user'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_invoice_products_updated_at
BEFORE UPDATE ON public.invoice_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_products_updated_at
BEFORE UPDATE ON public.quote_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to sync invoice products when invoice_services are created/updated
CREATE OR REPLACE FUNCTION public.sync_invoice_products()
RETURNS TRIGGER AS $$
DECLARE
  inv_record RECORD;
  svc_record RECORD;
  cli_record RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.invoice_products WHERE invoice_id = OLD.invoice_id AND service_id = OLD.service_id;
    RETURN OLD;
  END IF;

  SELECT * INTO inv_record FROM public.invoices WHERE id = NEW.invoice_id;
  SELECT * INTO svc_record FROM public.services WHERE id = NEW.service_id;
  SELECT * INTO cli_record FROM public.clients WHERE id = inv_record.client_id;

  INSERT INTO public.invoice_products (
    invoice_id, invoice_number, invoice_date, invoice_status,
    client_id, client_name, client_cif,
    service_id, service_name, service_category,
    quantity, unit_price, discount_percent, discount_amount,
    subtotal, iva_percent, iva_amount, total
  ) VALUES (
    NEW.invoice_id, inv_record.invoice_number, inv_record.issue_date, inv_record.status,
    inv_record.client_id, cli_record.name, cli_record.cif,
    NEW.service_id, svc_record.name, svc_record.category,
    NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
    NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
  )
  ON CONFLICT (id) DO UPDATE SET
    invoice_status = EXCLUDED.invoice_status,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    discount_percent = EXCLUDED.discount_percent,
    discount_amount = EXCLUDED.discount_amount,
    subtotal = EXCLUDED.subtotal,
    iva_percent = EXCLUDED.iva_percent,
    iva_amount = EXCLUDED.iva_amount,
    total = EXCLUDED.total,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to sync quote products when quote_services are created/updated
CREATE OR REPLACE FUNCTION public.sync_quote_products()
RETURNS TRIGGER AS $$
DECLARE
  qt_record RECORD;
  svc_record RECORD;
  cli_record RECORD;
  cnt_record RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.quote_products WHERE quote_id = OLD.quote_id AND service_id = OLD.service_id;
    RETURN OLD;
  END IF;

  SELECT * INTO qt_record FROM public.quotes WHERE id = NEW.quote_id;
  SELECT * INTO svc_record FROM public.services WHERE id = NEW.service_id;
  
  IF qt_record.client_id IS NOT NULL THEN
    SELECT * INTO cli_record FROM public.clients WHERE id = qt_record.client_id;
  END IF;
  
  IF qt_record.contact_id IS NOT NULL THEN
    SELECT * INTO cnt_record FROM public.contacts WHERE id = qt_record.contact_id;
  END IF;

  INSERT INTO public.quote_products (
    quote_id, quote_number, quote_date, quote_status,
    client_id, client_name, contact_id, contact_name,
    service_id, service_name, service_category,
    quantity, unit_price, discount_percent, discount_amount,
    subtotal, iva_percent, iva_amount, total
  ) VALUES (
    NEW.quote_id, qt_record.quote_number, qt_record.created_at::date, qt_record.status,
    qt_record.client_id, cli_record.name, qt_record.contact_id, cnt_record.name,
    NEW.service_id, svc_record.name, svc_record.category,
    NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
    NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
  )
  ON CONFLICT (id) DO UPDATE SET
    quote_status = EXCLUDED.quote_status,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    discount_percent = EXCLUDED.discount_percent,
    discount_amount = EXCLUDED.discount_amount,
    subtotal = EXCLUDED.subtotal,
    iva_percent = EXCLUDED.iva_percent,
    iva_amount = EXCLUDED.iva_amount,
    total = EXCLUDED.total,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers on invoice_services and quote_services
CREATE TRIGGER sync_invoice_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_services
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_products();

CREATE TRIGGER sync_quote_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quote_services
FOR EACH ROW
EXECUTE FUNCTION public.sync_quote_products();