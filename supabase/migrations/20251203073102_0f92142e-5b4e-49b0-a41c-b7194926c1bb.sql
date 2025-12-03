-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'readonly');

-- 2. Create enum for contact status
CREATE TYPE public.contact_status AS ENUM ('new', 'contacted', 'follow_up', 'discarded', 'converted');

-- 3. Create enum for client status
CREATE TYPE public.client_status AS ENUM ('active', 'inactive');

-- 4. Create enum for client segment
CREATE TYPE public.client_segment AS ENUM ('corporate', 'pyme', 'entrepreneur', 'individual');

-- 5. Create enum for service status
CREATE TYPE public.service_status AS ENUM ('active', 'inactive', 'development');

-- 6. Create enum for quote status
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected');

-- 7. Create enum for contract status
CREATE TYPE public.contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_activation');

-- 8. Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'partial', 'claimed');

-- 9. Create enum for billing period
CREATE TYPE public.billing_period AS ENUM ('monthly', 'quarterly', 'annual', 'one_time', 'other');

-- 10. Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');

-- 11. Create enum for remittance status
CREATE TYPE public.remittance_status AS ENUM ('pending', 'paid', 'partial', 'overdue');

-- 12. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'Europe/Madrid',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 14. Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_number SERIAL,
  email TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'web',
  status contact_status DEFAULT 'new',
  meeting_date TIMESTAMPTZ,
  presentation_url TEXT,
  quote_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number SERIAL,
  name TEXT NOT NULL,
  cif TEXT,
  email TEXT,
  phone TEXT,
  segment client_segment DEFAULT 'pyme',
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'España',
  iban TEXT,
  source TEXT,
  status client_status DEFAULT 'active',
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number SERIAL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  category TEXT,
  status service_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Quotes table
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number SERIAL,
  name TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status quote_status DEFAULT 'draft',
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  document_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Quote services (intermediate table)
CREATE TABLE public.quote_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number SERIAL,
  name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  billing_period billing_period DEFAULT 'monthly',
  next_billing_date DATE,
  status contract_status DEFAULT 'pending_activation',
  payment_status payment_status DEFAULT 'pending',
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  document_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Contract services (intermediate table)
CREATE TABLE public.contract_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number SERIAL,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status invoice_status DEFAULT 'draft',
  document_url TEXT,
  notes TEXT,
  remittance_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22. Invoice services (intermediate table)
CREATE TABLE public.invoice_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. Remittances table (remesas de cobro)
CREATE TABLE public.remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_number SERIAL,
  code TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  invoice_count INTEGER DEFAULT 0,
  status remittance_status DEFAULT 'pending',
  xml_file_url TEXT,
  n19_file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key from invoices to remittances
ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoice_remittance 
FOREIGN KEY (remittance_id) REFERENCES public.remittances(id) ON DELETE SET NULL;

-- 24. Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_number SERIAL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  source TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. Expenses table (gastos)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number SERIAL,
  supplier_name TEXT NOT NULL,
  supplier_cif TEXT,
  invoice_number TEXT,
  issue_date DATE NOT NULL,
  due_date DATE,
  concept TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  iva_percent DECIMAL(5,2) DEFAULT 21.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  irpf_percent DECIMAL(5,2) DEFAULT 0,
  irpf_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  document_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 27. Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 28. Function to check if user has any role (is authenticated with role)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- 29. RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 30. RLS Policies for user_roles (only admins)
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 31. RLS Policies for business tables (authenticated users with roles)
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage contacts" ON public.contacts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage clients" ON public.clients
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view quotes" ON public.quotes
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage quotes" ON public.quotes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view quote_services" ON public.quote_services
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage quote_services" ON public.quote_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage contracts" ON public.contracts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view contract_services" ON public.contract_services
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage contract_services" ON public.contract_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view invoice_services" ON public.invoice_services
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage invoice_services" ON public.invoice_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view remittances" ON public.remittances
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage remittances" ON public.remittances
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can manage campaigns" ON public.campaigns
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'user'));

CREATE POLICY "Authenticated users can view expenses" ON public.expenses
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and managers can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 32. Trigger to create profile and assign default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 33. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 34. Create updated_at triggers for all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_services_updated_at BEFORE UPDATE ON public.contract_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_remittances_updated_at BEFORE UPDATE ON public.remittances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();