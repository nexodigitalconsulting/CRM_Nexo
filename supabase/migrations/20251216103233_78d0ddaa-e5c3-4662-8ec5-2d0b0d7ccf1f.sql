-- Function to bootstrap the first admin (SECURITY DEFINER to bypass RLS)
-- Only works if NO admin exists yet
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  _user_id uuid,
  _email text,
  _full_name text DEFAULT 'Administrador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  
  IF admin_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe un administrador. Inicia sesión en /auth');
  END IF;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (_user_id, _email, _full_name)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Administrador creado correctamente');
END;
$$;