-- Create table for PDF configuration settings
CREATE TABLE public.pdf_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color text DEFAULT '#3366cc',
  secondary_color text DEFAULT '#666666',
  accent_color text DEFAULT '#0066cc',
  show_logo boolean DEFAULT true,
  logo_position text DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
  show_iban_footer boolean DEFAULT true,
  show_notes boolean DEFAULT true,
  show_discounts_column boolean DEFAULT true,
  header_style text DEFAULT 'classic' CHECK (header_style IN ('classic', 'modern', 'minimal')),
  font_size_base integer DEFAULT 10 CHECK (font_size_base BETWEEN 8 AND 14),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view PDF settings
CREATE POLICY "Authenticated users can view pdf_settings"
  ON public.pdf_settings
  FOR SELECT
  USING (has_any_role(auth.uid()));

-- Allow admins and managers to manage PDF settings
CREATE POLICY "Admins and managers can manage pdf_settings"
  ON public.pdf_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default settings row
INSERT INTO public.pdf_settings (id) VALUES (gen_random_uuid());

-- Create trigger to update updated_at
CREATE TRIGGER update_pdf_settings_updated_at
  BEFORE UPDATE ON public.pdf_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();