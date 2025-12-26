-- Añadir campo id_factura a la tabla expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS id_factura text;