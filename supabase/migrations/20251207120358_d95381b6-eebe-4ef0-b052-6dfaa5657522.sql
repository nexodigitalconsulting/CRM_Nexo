-- Modificar tabla campaigns para estructura de leads de n8n
ALTER TABLE public.campaigns 
DROP COLUMN IF EXISTS budget,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS source;

-- Añadir nuevos campos para datos de n8n
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS capture_date date DEFAULT CURRENT_DATE;

-- Crear tabla para configuración de entidades personalizadas
CREATE TABLE IF NOT EXISTS public.entity_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  icon text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.entity_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view entity_configurations" 
ON public.entity_configurations FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage entity_configurations" 
ON public.entity_configurations FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_entity_configurations_updated_at
BEFORE UPDATE ON public.entity_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar configuración base de entidades del sistema
INSERT INTO public.entity_configurations (entity_name, display_name, icon, is_system, fields) VALUES
('clients', 'Clientes', 'Building2', true, '[{"name":"name","label":"Nombre","type":"text","required":true},{"name":"cif","label":"CIF/NIF","type":"text"},{"name":"email","label":"Email","type":"email"},{"name":"phone","label":"Teléfono","type":"phone"},{"name":"address","label":"Dirección","type":"textarea"},{"name":"city","label":"Ciudad","type":"text"},{"name":"province","label":"Provincia","type":"text"},{"name":"postal_code","label":"Código Postal","type":"text"},{"name":"country","label":"País","type":"text"},{"name":"status","label":"Estado","type":"select","options":["active","inactive","blocked"]}]'),
('contacts', 'Contactos', 'Users', true, '[{"name":"name","label":"Nombre","type":"text","required":true},{"name":"email","label":"Email","type":"email"},{"name":"phone","label":"Teléfono","type":"phone"},{"name":"source","label":"Origen","type":"text"},{"name":"status","label":"Estado","type":"select","options":["new","contacted","qualified","converted","lost"]}]'),
('campaigns', 'Campañas', 'Megaphone', true, '[{"name":"name","label":"Nombre","type":"text","required":true},{"name":"place_id","label":"ID Place","type":"text"},{"name":"business_name","label":"Nombre Negocio","type":"textarea"},{"name":"email","label":"Email","type":"email"},{"name":"category","label":"Categoría","type":"textarea"},{"name":"phone","label":"Teléfono","type":"phone"},{"name":"website","label":"Web","type":"url"},{"name":"address","label":"Dirección","type":"textarea"},{"name":"province","label":"Provincia","type":"text"},{"name":"city","label":"Ciudad","type":"text"},{"name":"postal_code","label":"Código Postal","type":"text"},{"name":"capture_date","label":"Fecha Captura","type":"date"},{"name":"status","label":"Estado","type":"select","options":["active","scheduled","completed"]}]')
ON CONFLICT (entity_name) DO NOTHING;