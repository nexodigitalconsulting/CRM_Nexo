-- Modificar expense_number a text y hacerlo unique
-- Primero eliminar el default del sequence
ALTER TABLE public.expenses 
ALTER COLUMN expense_number DROP DEFAULT;

-- Cambiar el tipo a text
ALTER TABLE public.expenses 
ALTER COLUMN expense_number TYPE text USING expense_number::text;

-- Añadir constraint unique
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_expense_number_unique UNIQUE (expense_number);