-- =====================================================
-- 1. ADD RLS POLICIES FOR CAMPAIGNS TABLE
-- =====================================================

-- Allow admins and managers to insert campaigns
CREATE POLICY "Admins and managers can insert campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Allow admins and managers to update campaigns
CREATE POLICY "Admins and managers can update campaigns"
ON public.campaigns
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Allow admins and managers to delete campaigns
CREATE POLICY "Admins and managers can delete campaigns"
ON public.campaigns
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- =====================================================
-- 2. FIX EXPENSES UNIQUE CONSTRAINT
-- =====================================================
-- Remove the old simple unique constraint on expense_number
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_expense_number_unique;

-- Add a composite unique constraint on (supplier_name, invoice_number)
-- This allows different suppliers to have the same invoice number
ALTER TABLE public.expenses
ADD CONSTRAINT expenses_supplier_invoice_unique 
UNIQUE (supplier_name, invoice_number);