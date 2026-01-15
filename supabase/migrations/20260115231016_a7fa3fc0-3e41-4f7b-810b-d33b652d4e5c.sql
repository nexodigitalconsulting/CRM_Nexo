-- Migración v1.9.0: Añadir campos IRPF a invoices
DO $$
BEGIN
  -- Añadir irpf_percent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'irpf_percent'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN irpf_percent NUMERIC(5,2) DEFAULT 0;
    RAISE NOTICE 'Columna irpf_percent añadida';
  END IF;

  -- Añadir irpf_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'irpf_amount'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN irpf_amount NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE 'Columna irpf_amount añadida';
  END IF;

  -- Registrar migración si no existe
  IF NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = 'v1.9.0') THEN
    INSERT INTO public.schema_versions (version, description, applied_at)
    VALUES ('v1.9.0', 'Invoice IRPF fields (irpf_percent, irpf_amount)', now());
  END IF;
END $$;