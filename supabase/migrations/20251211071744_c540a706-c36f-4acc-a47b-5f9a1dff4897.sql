-- Fix sync_quote_products trigger to handle NULL contact_id
CREATE OR REPLACE FUNCTION public.sync_quote_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  qt_record RECORD;
  svc_record RECORD;
  cli_record RECORD;
  cnt_record RECORD;
  v_client_name text := NULL;
  v_contact_name text := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.quote_products WHERE quote_id = OLD.quote_id AND service_id = OLD.service_id;
    RETURN OLD;
  END IF;

  SELECT * INTO qt_record FROM public.quotes WHERE id = NEW.quote_id;
  SELECT * INTO svc_record FROM public.services WHERE id = NEW.service_id;
  
  -- Handle NULL client_id safely
  IF qt_record.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM public.clients WHERE id = qt_record.client_id;
  END IF;
  
  -- Handle NULL contact_id safely
  IF qt_record.contact_id IS NOT NULL THEN
    SELECT name INTO v_contact_name FROM public.contacts WHERE id = qt_record.contact_id;
  END IF;

  INSERT INTO public.quote_products (
    quote_id, quote_number, quote_date, quote_status,
    client_id, client_name, contact_id, contact_name,
    service_id, service_name, service_category,
    quantity, unit_price, discount_percent, discount_amount,
    subtotal, iva_percent, iva_amount, total
  ) VALUES (
    NEW.quote_id, qt_record.quote_number, qt_record.created_at::date, qt_record.status,
    qt_record.client_id, v_client_name, qt_record.contact_id, v_contact_name,
    NEW.service_id, svc_record.name, svc_record.category,
    NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
    NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
  )
  ON CONFLICT (id) DO UPDATE SET
    quote_status = EXCLUDED.quote_status,
    client_name = EXCLUDED.client_name,
    contact_name = EXCLUDED.contact_name,
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
$function$;