-- Create table for storing user table views/configurations
CREATE TABLE public.user_table_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  view_name TEXT NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_order JSONB DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  sort_config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique constraint for default views per user/entity
CREATE UNIQUE INDEX idx_user_table_views_default 
ON public.user_table_views (user_id, entity_name) 
WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.user_table_views ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own views
CREATE POLICY "Users can view own table views" 
ON public.user_table_views 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own table views" 
ON public.user_table_views 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_table_views_updated_at
BEFORE UPDATE ON public.user_table_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();