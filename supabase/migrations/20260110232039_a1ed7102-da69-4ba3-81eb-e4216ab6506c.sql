-- Add INSERT, UPDATE, DELETE policies for document_templates
CREATE POLICY "Admins and managers can insert document_templates"
ON public.document_templates
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

CREATE POLICY "Admins and managers can update document_templates"
ON public.document_templates
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

CREATE POLICY "Admins and managers can delete document_templates"
ON public.document_templates
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- Add INSERT, UPDATE, DELETE policies for entity_configurations
CREATE POLICY "Admins and managers can insert entity_configurations"
ON public.entity_configurations
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

CREATE POLICY "Admins and managers can update entity_configurations"
ON public.entity_configurations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);

CREATE POLICY "Admins and managers can delete entity_configurations"
ON public.entity_configurations
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'manager'::public.app_role)
);