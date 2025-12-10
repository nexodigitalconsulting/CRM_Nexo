-- Crear enum para categorías de importancia
CREATE TYPE public.event_importance AS ENUM ('high', 'medium', 'low');

-- Crear tabla para categorías de calendario personalizables
CREATE TABLE public.calendar_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  importance event_importance DEFAULT 'medium',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Crear tabla para disponibilidad de usuarios
CREATE TABLE public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Crear tabla para eventos del calendario
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  category_id UUID REFERENCES public.calendar_categories(id) ON DELETE SET NULL,
  importance event_importance DEFAULT 'medium',
  location TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  google_event_id TEXT,
  google_calendar_id TEXT,
  is_synced_to_google BOOLEAN DEFAULT false,
  reminder_minutes INTEGER,
  recurrence_rule TEXT,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_datetime_range CHECK (end_datetime >= start_datetime)
);

-- Crear tabla para configuración de Google Calendar
CREATE TABLE public.google_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT false,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_google', 'from_google', 'both')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para configuración de empresa
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cif TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT DEFAULT 'España',
  logo_url TEXT,
  website TEXT,
  iban TEXT,
  currency TEXT DEFAULT 'EUR',
  timezone TEXT DEFAULT 'Europe/Madrid',
  language TEXT DEFAULT 'es',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_categories
CREATE POLICY "Users can view own categories"
ON public.calendar_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories"
ON public.calendar_categories FOR ALL
USING (auth.uid() = user_id);

-- Policies for user_availability
CREATE POLICY "Users can view own availability"
ON public.user_availability FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own availability"
ON public.user_availability FOR ALL
USING (auth.uid() = user_id);

-- Policies for calendar_events
CREATE POLICY "Users can view own events"
ON public.calendar_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own events"
ON public.calendar_events FOR ALL
USING (auth.uid() = user_id);

-- Policies for google_calendar_config
CREATE POLICY "Users can view own google config"
ON public.google_calendar_config FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own google config"
ON public.google_calendar_config FOR ALL
USING (auth.uid() = user_id);

-- Policies for company_settings (admins only for management)
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage company settings"
ON public.company_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_calendar_categories_updated_at
BEFORE UPDATE ON public.calendar_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_availability_updated_at
BEFORE UPDATE ON public.user_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_config_updated_at
BEFORE UPDATE ON public.google_calendar_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (name) VALUES ('Mi Empresa');