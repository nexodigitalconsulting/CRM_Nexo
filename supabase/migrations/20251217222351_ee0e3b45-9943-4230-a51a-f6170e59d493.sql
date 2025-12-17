-- Permitir lectura pública de schema_versions (necesario para que el frontend verifique la versión)
CREATE POLICY "Anyone can read schema versions" 
  ON public.schema_versions 
  FOR SELECT 
  TO anon 
  USING (true);

-- También permitir a usuarios autenticados
CREATE POLICY "Authenticated users can read schema versions" 
  ON public.schema_versions 
  FOR SELECT 
  TO authenticated 
  USING (true);