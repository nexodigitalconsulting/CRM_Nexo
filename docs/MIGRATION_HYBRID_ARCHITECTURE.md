# Plan de Migración: Arquitectura Híbrida PostgreSQL + Supabase

## Resumen Ejecutivo

Esta guía documenta la migración de un CRM desde Supabase completo a una arquitectura híbrida:
- **PostgreSQL Externo (EasyPanel)**: Datos de negocio (clientes, facturas, contratos, etc.)
- **Supabase Cloud (Free Tier)**: Auth, Storage, Edge Functions, y RAG vectorial

### Beneficios
- ✅ Conexión directa desde n8n a PostgreSQL externo
- ✅ Control total sobre backups y recursos
- ✅ Supabase Free Tier suficiente (500MB para RAG + auth)
- ✅ Replicable en múltiples proyectos EasyPanel

---

## 1. Distribución de Tablas

### 1.1 Tablas en PostgreSQL Externo (EasyPanel)

Todas las tablas de **datos de negocio del CRM**:

| Tabla | Descripción | Registros Estimados |
|-------|-------------|---------------------|
| `clients` | Clientes | Alto |
| `contacts` | Contactos/Leads | Alto |
| `quotes` | Presupuestos | Medio |
| `quote_services` | Líneas de presupuesto | Alto |
| `quote_products` | Vista desnormalizada quotes | Alto |
| `contracts` | Contratos | Medio |
| `contract_services` | Servicios contratados | Medio |
| `invoices` | Facturas | Alto |
| `invoice_services` | Líneas de factura | Alto |
| `invoice_products` | Vista desnormalizada invoices | Alto |
| `services` | Catálogo de servicios | Bajo |
| `expenses` | Gastos | Medio |
| `remittances` | Remesas bancarias | Bajo |
| `campaigns` | Campañas marketing | Bajo |
| `company_settings` | Configuración empresa | 1 registro |
| `email_settings` | Config SMTP | 1 registro |
| `email_templates` | Plantillas email | Bajo |
| `notification_rules` | Reglas notificación | Bajo |
| `notification_queue` | Cola de envíos | Variable |
| `client_notification_preferences` | Preferencias cliente | Medio |
| `document_templates` | Plantillas documentos | Bajo |
| `entity_configurations` | Config entidades | Bajo |

### 1.2 Tablas en Supabase Cloud

Tablas que **requieren funcionalidades específicas de Supabase**:

| Tabla | Razón | Funcionalidad Supabase |
|-------|-------|------------------------|
| `profiles` | Vinculada a auth.users | Auth triggers |
| `user_roles` | Permisos de usuario | RLS + Auth |
| `user_table_views` | Preferencias UI usuario | RLS por user_id |
| `user_availability` | Disponibilidad usuario | RLS por user_id |
| `calendar_events` | Eventos calendario | RLS por user_id |
| `calendar_categories` | Categorías calendario | RLS por user_id |
| `google_calendar_config` | OAuth tokens | Seguridad + RLS |
| `documents_rag` | Embeddings vectoriales | pgvector + RAG |

---

## 2. Arquitectura de Conexión

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │  supabaseClient │              │      pgClient           │   │
│  │  (Auth/Storage) │              │  (Datos de negocio)     │   │
│  └────────┬────────┘              └───────────┬─────────────┘   │
│           │                                   │                  │
└───────────┼───────────────────────────────────┼──────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────┐         ┌─────────────────────────────┐
│   SUPABASE CLOUD      │         │   POSTGRESQL (EasyPanel)    │
│   (Free Tier)         │         │   (VPS/Docker)              │
├───────────────────────┤         ├─────────────────────────────┤
│ • Auth (users)        │         │ • clients                   │
│ • Storage (files)     │         │ • invoices                  │
│ • profiles            │         │ • contracts                 │
│ • user_roles          │         │ • quotes                    │
│ • documents_rag       │         │ • services                  │
│ • calendar_*          │         │ • expenses                  │
│ • Edge Functions      │         │ • campaigns                 │
│                       │         │ • remittances               │
│                       │         │ • ... (todas CRM)           │
└───────────────────────┘         └─────────────────────────────┘
            │                                   │
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                           N8N                                    │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Node ──────────► PostgreSQL Externo (CRM data)      │
│  Supabase Node   ──────────► Supabase Cloud (RAG queries)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Configuración PostgreSQL Externo

### 3.1 Docker Compose para EasyPanel

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: crm_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-crm_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-crm_database}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-crm_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 3.2 Variables de Entorno

```env
# .env.external-postgres
POSTGRES_HOST=your-easypanel-domain.com
POSTGRES_PORT=5432
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=crm_database
DATABASE_URL=postgresql://crm_user:your_secure_password@your-easypanel-domain.com:5432/crm_database
```

### 3.3 Script de Inicialización

```sql
-- init-scripts/01-create-tables.sql

-- =============================================
-- TABLAS DE NEGOCIO CRM
-- =============================================

-- Secuencias
CREATE SEQUENCE IF NOT EXISTS clients_client_number_seq;
CREATE SEQUENCE IF NOT EXISTS contacts_contact_number_seq;
CREATE SEQUENCE IF NOT EXISTS services_service_number_seq;
CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;
CREATE SEQUENCE IF NOT EXISTS contracts_contract_number_seq;
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_number_seq;
CREATE SEQUENCE IF NOT EXISTS expenses_expense_number_seq;
CREATE SEQUENCE IF NOT EXISTS remittances_remittance_number_seq;
CREATE SEQUENCE IF NOT EXISTS campaigns_campaign_number_seq;

-- ENUMs
CREATE TYPE client_segment AS ENUM ('corporate', 'pyme', 'entrepreneur', 'individual');
CREATE TYPE client_status AS ENUM ('active', 'inactive');
CREATE TYPE contact_status AS ENUM ('new', 'contacted', 'follow_up', 'discarded', 'converted');
CREATE TYPE service_status AS ENUM ('active', 'inactive', 'development');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_activation');
CREATE TYPE billing_period AS ENUM ('monthly', 'quarterly', 'annual', 'one_time', 'other');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial', 'claimed');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');
CREATE TYPE remittance_status AS ENUM ('pending', 'paid', 'partial', 'overdue');

-- Tabla: services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number INTEGER NOT NULL DEFAULT nextval('services_service_number_seq'),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    iva_percent NUMERIC DEFAULT 21.00,
    status service_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_number INTEGER NOT NULL DEFAULT nextval('clients_client_number_seq'),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cif TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'España',
    iban TEXT,
    segment client_segment DEFAULT 'pyme',
    status client_status DEFAULT 'active',
    source TEXT,
    notes TEXT,
    contact_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_number INTEGER NOT NULL DEFAULT nextval('contacts_contact_number_seq'),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'web',
    status contact_status DEFAULT 'new',
    meeting_date TIMESTAMPTZ,
    presentation_url TEXT,
    quote_url TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- FK: clients -> contacts
ALTER TABLE clients ADD CONSTRAINT clients_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Tabla: quotes
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number INTEGER NOT NULL DEFAULT nextval('quotes_quote_number_seq'),
    name TEXT,
    client_id UUID REFERENCES clients(id),
    contact_id UUID REFERENCES contacts(id),
    status quote_status DEFAULT 'draft',
    valid_until DATE,
    subtotal NUMERIC DEFAULT 0,
    iva_total NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: quote_services
CREATE TABLE quote_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    iva_percent NUMERIC DEFAULT 21.00,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: quote_products (vista desnormalizada)
CREATE TABLE quote_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    quote_number INTEGER NOT NULL,
    quote_date DATE NOT NULL,
    quote_status TEXT,
    client_id UUID,
    client_name TEXT,
    contact_id UUID,
    contact_name TEXT,
    service_id UUID NOT NULL REFERENCES services(id),
    service_name TEXT NOT NULL,
    service_category TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    iva_percent NUMERIC DEFAULT 21,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: contracts
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number INTEGER NOT NULL DEFAULT nextval('contracts_contract_number_seq'),
    name TEXT,
    client_id UUID NOT NULL REFERENCES clients(id),
    quote_id UUID REFERENCES quotes(id),
    status contract_status DEFAULT 'pending_activation',
    billing_period billing_period DEFAULT 'monthly',
    payment_status payment_status DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    subtotal NUMERIC DEFAULT 0,
    iva_total NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: contract_services
CREATE TABLE contract_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    iva_percent NUMERIC DEFAULT 21.00,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number INTEGER NOT NULL DEFAULT nextval('invoices_invoice_number_seq'),
    client_id UUID NOT NULL REFERENCES clients(id),
    contract_id UUID REFERENCES contracts(id),
    remittance_id UUID,
    status invoice_status DEFAULT 'draft',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal NUMERIC DEFAULT 0,
    iva_percent NUMERIC DEFAULT 21.00,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: invoice_services
CREATE TABLE invoice_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    description TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    iva_percent NUMERIC DEFAULT 21.00,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: invoice_products (vista desnormalizada)
CREATE TABLE invoice_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_number INTEGER NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_status TEXT,
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    client_cif TEXT,
    service_id UUID NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    subtotal NUMERIC NOT NULL,
    iva_percent NUMERIC DEFAULT 21,
    iva_amount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: remittances
CREATE TABLE remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remittance_number INTEGER NOT NULL DEFAULT nextval('remittances_remittance_number_seq'),
    code TEXT,
    status remittance_status DEFAULT 'pending',
    issue_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC DEFAULT 0,
    invoice_count INTEGER DEFAULT 0,
    notes TEXT,
    xml_file_url TEXT,
    n19_file_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- FK: invoices -> remittances
ALTER TABLE invoices ADD CONSTRAINT fk_invoice_remittance 
    FOREIGN KEY (remittance_id) REFERENCES remittances(id);

-- Tabla: expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number INTEGER NOT NULL DEFAULT nextval('expenses_expense_number_seq'),
    supplier_name TEXT NOT NULL,
    supplier_cif TEXT,
    concept TEXT,
    invoice_number TEXT,
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC DEFAULT 0,
    iva_percent NUMERIC DEFAULT 21.00,
    iva_amount NUMERIC DEFAULT 0,
    irpf_percent NUMERIC DEFAULT 0,
    irpf_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    document_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_number INTEGER NOT NULL DEFAULT nextval('campaigns_campaign_number_seq'),
    name TEXT NOT NULL,
    business_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    category TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    place_id TEXT,
    status TEXT DEFAULT 'active',
    capture_date DATE DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: company_settings
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cif TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'España',
    iban TEXT,
    currency TEXT DEFAULT 'EUR',
    language TEXT DEFAULT 'es',
    timezone TEXT DEFAULT 'Europe/Madrid',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: email_settings
CREATE TABLE email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    smtp_secure BOOLEAN DEFAULT true,
    from_email TEXT NOT NULL,
    from_name TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: email_templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: notification_rules
CREATE TABLE notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    description TEXT,
    days_threshold INTEGER DEFAULT 3,
    template_id UUID REFERENCES email_templates(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: notification_queue
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    rule_type TEXT NOT NULL,
    client_id UUID,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: client_notification_preferences
CREATE TABLE client_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, rule_type)
);

-- Tabla: document_templates
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: entity_configurations
CREATE TABLE entity_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    icon TEXT,
    fields JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TRIGGERS para updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'clients', 'contacts', 'services', 'quotes', 'quote_services',
            'contracts', 'contract_services', 'invoices', 'invoice_services',
            'expenses', 'remittances', 'campaigns', 'company_settings',
            'email_settings', 'email_templates', 'notification_rules',
            'document_templates', 'entity_configurations', 'client_notification_preferences',
            'quote_products', 'invoice_products'
        )
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
        ', t, t);
    END LOOP;
END;
$$;

-- =============================================
-- TRIGGERS para sync de productos
-- =============================================

CREATE OR REPLACE FUNCTION sync_invoice_products()
RETURNS TRIGGER AS $$
DECLARE
    inv_record RECORD;
    svc_record RECORD;
    cli_record RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM invoice_products 
        WHERE invoice_id = OLD.invoice_id AND service_id = OLD.service_id;
        RETURN OLD;
    END IF;

    SELECT * INTO inv_record FROM invoices WHERE id = NEW.invoice_id;
    SELECT * INTO svc_record FROM services WHERE id = NEW.service_id;
    SELECT * INTO cli_record FROM clients WHERE id = inv_record.client_id;

    INSERT INTO invoice_products (
        invoice_id, invoice_number, invoice_date, invoice_status,
        client_id, client_name, client_cif,
        service_id, service_name, service_category,
        quantity, unit_price, discount_percent, discount_amount,
        subtotal, iva_percent, iva_amount, total
    ) VALUES (
        NEW.invoice_id, inv_record.invoice_number, inv_record.issue_date, inv_record.status,
        inv_record.client_id, cli_record.name, cli_record.cif,
        NEW.service_id, svc_record.name, svc_record.category,
        NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
        NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
    )
    ON CONFLICT (id) DO UPDATE SET
        invoice_status = EXCLUDED.invoice_status,
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        discount_percent = EXCLUDED.discount_percent,
        discount_amount = EXCLUDED.discount_amount,
        subtotal = EXCLUDED.subtotal,
        iva_percent = EXCLUDED.iva_percent,
        iva_amount = EXCLUDED.iva_amount,
        total = EXCLUDED.total,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_invoice_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoice_services
FOR EACH ROW EXECUTE FUNCTION sync_invoice_products();

CREATE OR REPLACE FUNCTION sync_quote_products()
RETURNS TRIGGER AS $$
DECLARE
    qt_record RECORD;
    svc_record RECORD;
    v_client_name TEXT := NULL;
    v_contact_name TEXT := NULL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM quote_products 
        WHERE quote_id = OLD.quote_id AND service_id = OLD.service_id;
        RETURN OLD;
    END IF;

    SELECT * INTO qt_record FROM quotes WHERE id = NEW.quote_id;
    SELECT * INTO svc_record FROM services WHERE id = NEW.service_id;
    
    IF qt_record.client_id IS NOT NULL THEN
        SELECT name INTO v_client_name FROM clients WHERE id = qt_record.client_id;
    END IF;
    
    IF qt_record.contact_id IS NOT NULL THEN
        SELECT name INTO v_contact_name FROM contacts WHERE id = qt_record.contact_id;
    END IF;

    INSERT INTO quote_products (
        quote_id, quote_number, quote_date, quote_status,
        client_id, client_name, contact_id, contact_name,
        service_id, service_name, service_category,
        quantity, unit_price, discount_percent, discount_amount,
        subtotal, iva_percent, iva_amount, total
    ) VALUES (
        NEW.quote_id, qt_record.quote_number, qt_record.created_at::date, qt_record.status,
        qt_record.client_id, v_client_name, qt_record.contact_id, v_contact_name,
        NEW.service_id, svc_record.name, svc_record.category,
        NEW.quantity, NEW.unit_price, NEW.discount_percent, NEW.discount_amount,
        NEW.subtotal, NEW.iva_percent, NEW.iva_amount, NEW.total
    )
    ON CONFLICT (id) DO UPDATE SET
        quote_status = EXCLUDED.quote_status,
        client_name = EXCLUDED.client_name,
        contact_name = EXCLUDED.contact_name,
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        discount_percent = EXCLUDED.discount_percent,
        discount_amount = EXCLUDED.discount_amount,
        subtotal = EXCLUDED.subtotal,
        iva_percent = EXCLUDED.iva_percent,
        iva_amount = EXCLUDED.iva_amount,
        total = EXCLUDED.total,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_quote_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON quote_services
FOR EACH ROW EXECUTE FUNCTION sync_quote_products();

-- =============================================
-- ÍNDICES para rendimiento
-- =============================================

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_segment ON clients(segment);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_issue_date ON expenses(issue_date);
CREATE INDEX idx_campaigns_status ON campaigns(status);
```

---

## 4. Cambios de Código

### 4.1 Nuevo Cliente PostgreSQL

Crear archivo `src/integrations/postgres/client.ts`:

```typescript
// src/integrations/postgres/client.ts
import { Pool, QueryResult } from 'pg';

// Configuración del pool de conexiones
const pool = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: import.meta.env.VITE_DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Cliente tipado para PostgreSQL
export const pgClient = {
  query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  },
  
  // Helper para obtener un solo registro
  single: async <T = any>(text: string, params?: any[]): Promise<T | null> => {
    const result = await pgClient.query<T>(text, params);
    return result.rows[0] || null;
  },
  
  // Helper para obtener múltiples registros
  many: async <T = any>(text: string, params?: any[]): Promise<T[]> => {
    const result = await pgClient.query<T>(text, params);
    return result.rows;
  },
};

export default pgClient;
```

### 4.2 Variables de Entorno Frontend

Actualizar `.env`:

```env
# Supabase (Auth, Storage, RAG)
VITE_SUPABASE_URL=https://honfwrfkiukckyoelsdm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PostgreSQL Externo (CRM Data)
VITE_DATABASE_URL=postgresql://crm_user:password@your-easypanel-domain.com:5432/crm_database
VITE_DATABASE_SSL=true
```

### 4.3 Hooks Refactorizados

Ejemplo de refactorización de `useClients.tsx`:

```typescript
// src/hooks/useClients.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pgClient } from '@/integrations/postgres/client';
import { toast } from '@/hooks/use-toast';

export interface Client {
  id: string;
  client_number: number;
  name: string;
  email: string | null;
  phone: string | null;
  cif: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  iban: string | null;
  segment: 'corporate' | 'pyme' | 'entrepreneur' | 'individual' | null;
  status: 'active' | 'inactive' | null;
  source: string | null;
  notes: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ClientInsert = Omit<Client, 'id' | 'client_number' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<ClientInsert>;

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const clients = await pgClient.many<Client>(
        'SELECT * FROM clients ORDER BY client_number DESC'
      );
      return clients;
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      if (!id) return null;
      return pgClient.single<Client>(
        'SELECT * FROM clients WHERE id = $1',
        [id]
      );
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const columns = Object.keys(client).join(', ');
      const values = Object.values(client);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await pgClient.single<Client>(
        `INSERT INTO clients (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Cliente creado correctamente' });
    },
    onError: (error) => {
      toast({ title: 'Error al crear cliente', variant: 'destructive' });
      console.error(error);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ClientUpdate) => {
      const setClause = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      const values = [id, ...Object.values(updates)];
      
      const result = await pgClient.single<Client>(
        `UPDATE clients SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
        values
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Cliente actualizado correctamente' });
    },
    onError: (error) => {
      toast({ title: 'Error al actualizar cliente', variant: 'destructive' });
      console.error(error);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await pgClient.query('DELETE FROM clients WHERE id = $1', [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Cliente eliminado correctamente' });
    },
    onError: (error) => {
      toast({ title: 'Error al eliminar cliente', variant: 'destructive' });
      console.error(error);
    },
  });
}
```

### 4.4 Edge Functions con PostgreSQL Externo

```typescript
// supabase/functions/crm-query/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pool de conexiones al PostgreSQL externo
const pool = new Pool(Deno.env.get('DATABASE_URL')!, 3, true);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table, action, data, filters } = await req.json();
    
    const connection = await pool.connect();
    
    try {
      let result;
      
      switch (action) {
        case 'select':
          const whereClause = filters 
            ? `WHERE ${Object.entries(filters).map(([k, v], i) => `${k} = $${i + 1}`).join(' AND ')}`
            : '';
          result = await connection.queryObject(
            `SELECT * FROM ${table} ${whereClause}`,
            filters ? Object.values(filters) : []
          );
          break;
          
        case 'insert':
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
          result = await connection.queryObject(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
            Object.values(data)
          );
          break;
          
        case 'update':
          const setClause = Object.keys(data)
            .filter(k => k !== 'id')
            .map((k, i) => `${k} = $${i + 2}`)
            .join(', ');
          result = await connection.queryObject(
            `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`,
            [data.id, ...Object.values(data).filter((_, i) => Object.keys(data)[i] !== 'id')]
          );
          break;
          
        case 'delete':
          result = await connection.queryObject(
            `DELETE FROM ${table} WHERE id = $1`,
            [data.id]
          );
          break;
      }
      
      return new Response(JSON.stringify({ data: result?.rows }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 5. Plan de Migración Paso a Paso

### Fase 1: Preparación (1-2 días)

1. **Configurar PostgreSQL en EasyPanel**
   - Desplegar contenedor PostgreSQL
   - Configurar variables de entorno
   - Ejecutar script de inicialización
   - Verificar conectividad desde n8n

2. **Crear backup de Supabase**
   ```bash
   # Exportar datos actuales
   pg_dump -h db.honfwrfkiukckyoelsdm.supabase.co \
     -U postgres -d postgres \
     --data-only --inserts \
     -t clients -t contacts -t services ... \
     > backup_crm_data.sql
   ```

### Fase 2: Migración de Datos (1 día)

1. **Importar estructura**
   ```bash
   psql -h your-easypanel-domain.com \
     -U crm_user -d crm_database \
     < init-scripts/01-create-tables.sql
   ```

2. **Importar datos**
   ```bash
   psql -h your-easypanel-domain.com \
     -U crm_user -d crm_database \
     < backup_crm_data.sql
   ```

3. **Verificar integridad**
   ```sql
   -- Contar registros
   SELECT 
     (SELECT COUNT(*) FROM clients) as clients,
     (SELECT COUNT(*) FROM invoices) as invoices,
     (SELECT COUNT(*) FROM contracts) as contracts;
   ```

### Fase 3: Actualización de Código (2-3 días)

1. **Crear cliente PostgreSQL** (`src/integrations/postgres/client.ts`)

2. **Refactorizar hooks** (uno por uno, con tests):
   - `useClients.tsx`
   - `useContacts.tsx`
   - `useServices.tsx`
   - `useQuotes.tsx`
   - `useContracts.tsx`
   - `useInvoices.tsx`
   - `useExpenses.tsx`
   - `useRemittances.tsx`
   - `useCampaigns.tsx`
   - `useCompanySettings.tsx`
   - `useEmailSettings.tsx`
   - `useTemplates.tsx`
   - `useEntityConfigurations.tsx`

3. **Actualizar Edge Functions** que acceden a datos CRM

### Fase 4: Testing (1-2 días)

1. **Tests funcionales**
   - CRUD completo de cada entidad
   - Relaciones entre entidades
   - Triggers de sincronización

2. **Tests de rendimiento**
   - Latencia de queries
   - Concurrencia

3. **Tests de integración n8n**
   - Conexión directa a PostgreSQL externo
   - Queries RAG a Supabase

### Fase 5: Limpieza (1 día)

1. **Eliminar tablas migradas de Supabase**
   ```sql
   -- Solo después de verificar que todo funciona
   DROP TABLE IF EXISTS clients CASCADE;
   DROP TABLE IF EXISTS invoices CASCADE;
   -- etc.
   ```

2. **Actualizar documentación**

3. **Configurar backups automáticos**

---

## 6. Configuración n8n

### 6.1 Nodo PostgreSQL (Datos CRM)

```
Host: your-easypanel-domain.com
Port: 5432
Database: crm_database
User: crm_user
Password: ****
SSL: Require
```

### 6.2 Nodo Supabase (RAG)

```
Host: db.honfwrfkiukckyoelsdm.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: **** (desde Supabase Dashboard)
```

### 6.3 Ejemplo Workflow n8n

```json
{
  "nodes": [
    {
      "name": "Get Client Data",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM clients WHERE status = 'active'"
      },
      "credentials": {
        "postgres": "PostgreSQL CRM"
      }
    },
    {
      "name": "RAG Query",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM match_documents_rag($1, 5)",
        "queryParams": "={{ $json.embedding }}"
      },
      "credentials": {
        "supabase": "Supabase Cloud"
      }
    }
  ]
}
```

---

## 7. Replicación para Nuevos Proyectos

### 7.1 Template EasyPanel

Crear template reutilizable:

```yaml
# easypanel-crm-template.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: "{{POSTGRES_PASSWORD}}"
      POSTGRES_DB: crm_database
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  n8n:
    image: n8nio/n8n
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
    depends_on:
      - postgres
    ports:
      - "5678:5678"
```

### 7.2 Checklist de Despliegue

- [ ] Crear proyecto en EasyPanel
- [ ] Desplegar PostgreSQL con template
- [ ] Ejecutar script de inicialización
- [ ] Crear proyecto Supabase Cloud
- [ ] Configurar Auth y Storage
- [ ] Migrar tabla `documents_rag`
- [ ] Configurar variables de entorno en frontend
- [ ] Verificar conectividad n8n ↔ PostgreSQL
- [ ] Verificar conectividad n8n ↔ Supabase (RAG)

---

## 8. Troubleshooting

### Error: Connection refused

```bash
# Verificar que PostgreSQL acepta conexiones externas
# En postgresql.conf:
listen_addresses = '*'

# En pg_hba.conf:
host    all    all    0.0.0.0/0    scram-sha-256
```

### Error: SSL required

```bash
# Generar certificados para PostgreSQL
openssl req -new -x509 -days 365 -nodes \
  -out server.crt -keyout server.key \
  -subj "/CN=your-easypanel-domain.com"
```

### Error: Too many connections

```sql
-- Ajustar límites
ALTER SYSTEM SET max_connections = 100;
SELECT pg_reload_conf();
```

---

## Conclusión

Esta arquitectura híbrida ofrece:

1. **Flexibilidad**: Datos CRM en PostgreSQL controlado, auth/RAG en Supabase
2. **Escalabilidad**: Sin límites de Supabase para datos de negocio
3. **Conectividad**: n8n puede acceder directamente a PostgreSQL
4. **Costo-eficiencia**: Supabase Free Tier suficiente para auth + RAG
5. **Replicabilidad**: Template listo para nuevos proyectos EasyPanel
