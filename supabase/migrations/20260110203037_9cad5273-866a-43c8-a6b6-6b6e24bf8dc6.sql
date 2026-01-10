-- Add INSERT/UPDATE/DELETE RLS policies for all form-related tables
-- Allows admin and manager roles to perform these operations

-- ============================================
-- INVOICES
-- ============================================

CREATE POLICY "Admins and managers can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update invoices"
ON public.invoices
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete invoices"
ON public.invoices
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- INVOICE_SERVICES
-- ============================================

CREATE POLICY "Admins and managers can insert invoice_services"
ON public.invoice_services
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update invoice_services"
ON public.invoice_services
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete invoice_services"
ON public.invoice_services
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- QUOTES
-- ============================================

CREATE POLICY "Admins and managers can insert quotes"
ON public.quotes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update quotes"
ON public.quotes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete quotes"
ON public.quotes
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- QUOTE_SERVICES
-- ============================================

CREATE POLICY "Admins and managers can insert quote_services"
ON public.quote_services
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update quote_services"
ON public.quote_services
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete quote_services"
ON public.quote_services
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- EXPENSES
-- ============================================

CREATE POLICY "Admins and managers can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update expenses"
ON public.expenses
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete expenses"
ON public.expenses
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- COMPANY_SETTINGS
-- ============================================

CREATE POLICY "Admins and managers can insert company_settings"
ON public.company_settings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update company_settings"
ON public.company_settings
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete company_settings"
ON public.company_settings
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- PDF_SETTINGS
-- ============================================

CREATE POLICY "Admins and managers can insert pdf_settings"
ON public.pdf_settings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update pdf_settings"
ON public.pdf_settings
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete pdf_settings"
ON public.pdf_settings
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- CLIENTS
-- ============================================

CREATE POLICY "Admins and managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete clients"
ON public.clients
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- CONTACTS
-- ============================================

CREATE POLICY "Admins and managers can insert contacts"
ON public.contacts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update contacts"
ON public.contacts
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete contacts"
ON public.contacts
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- SERVICES
-- ============================================

CREATE POLICY "Admins and managers can insert services"
ON public.services
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update services"
ON public.services
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete services"
ON public.services
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- REMITTANCES
-- ============================================

CREATE POLICY "Admins and managers can insert remittances"
ON public.remittances
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update remittances"
ON public.remittances
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete remittances"
ON public.remittances
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- INVOICE_PRODUCTS
-- ============================================

CREATE POLICY "Admins and managers can insert invoice_products"
ON public.invoice_products
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update invoice_products"
ON public.invoice_products
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete invoice_products"
ON public.invoice_products
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- QUOTE_PRODUCTS
-- ============================================

CREATE POLICY "Admins and managers can insert quote_products"
ON public.quote_products
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update quote_products"
ON public.quote_products
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete quote_products"
ON public.quote_products
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- EMAIL_SETTINGS
-- ============================================

CREATE POLICY "Admins and managers can insert email_settings"
ON public.email_settings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update email_settings"
ON public.email_settings
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete email_settings"
ON public.email_settings
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);