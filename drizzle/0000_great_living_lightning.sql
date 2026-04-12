CREATE TYPE "public"."app_role" AS ENUM('admin', 'manager', 'user', 'readonly');--> statement-breakpoint
CREATE TYPE "public"."billing_period" AS ENUM('mensual', 'trimestral', 'anual', 'unico', 'otro');--> statement-breakpoint
CREATE TYPE "public"."client_segment" AS ENUM('corporativo', 'pyme', 'autonomo', 'particular');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('nuevo', 'contactado', 'seguimiento', 'descartado', 'convertido');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('vigente', 'expirado', 'cancelado', 'pendiente_activacion');--> statement-breakpoint
CREATE TYPE "public"."event_importance" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('borrador', 'emitida', 'pagada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pagado', 'pendiente', 'parcial', 'reclamado');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('borrador', 'enviado', 'aceptado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."remittance_status" AS ENUM('pendiente', 'enviada', 'cobrada', 'parcial', 'devuelta', 'anulada', 'vencida');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('activo', 'inactivo', 'desarrollo');--> statement-breakpoint
CREATE TABLE "ba_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ba_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ba_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ba_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "ba_organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ba_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "ba_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ba_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ba_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ba_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"importance" "event_importance" DEFAULT 'media',
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_datetime" timestamp with time zone NOT NULL,
	"end_datetime" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false,
	"category_id" uuid,
	"importance" "event_importance" DEFAULT 'media',
	"status" text DEFAULT 'confirmed',
	"notes" text,
	"reminder_minutes" integer,
	"recurrence_rule" text,
	"client_id" uuid,
	"contact_id" uuid,
	"contract_id" uuid,
	"google_event_id" text,
	"google_calendar_id" text,
	"is_synced_to_google" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"campaign_number" integer NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"email" text,
	"phone" text,
	"category" text,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"website" text,
	"place_id" text,
	"capture_date" date,
	"status" text DEFAULT 'active',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"client_number" integer NOT NULL,
	"name" text NOT NULL,
	"cif" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"country" text DEFAULT 'España',
	"iban" text,
	"bic" text,
	"sepa_mandate_id" text,
	"sepa_mandate_date" date,
	"sepa_sequence_type" text DEFAULT 'RCUR',
	"segment" "client_segment" DEFAULT 'pyme',
	"status" "client_status" DEFAULT 'activo',
	"source" text,
	"notes" text,
	"contact_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"cif" text,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"country" text DEFAULT 'España',
	"phone" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"iban" text,
	"bic" text,
	"sepa_creditor_id" text,
	"currency" text DEFAULT 'EUR',
	"language" text DEFAULT 'es',
	"timezone" text DEFAULT 'Europe/Madrid',
	"date_format" text DEFAULT 'DD/MM/YYYY',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"contact_number" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text DEFAULT 'web',
	"status" "contact_status" DEFAULT 'nuevo',
	"meeting_date" timestamp with time zone,
	"presentation_url" text,
	"quote_url" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric NOT NULL,
	"discount_percent" numeric DEFAULT '0',
	"discount_amount" numeric DEFAULT '0',
	"subtotal" numeric NOT NULL,
	"iva_percent" numeric DEFAULT '21.00',
	"iva_amount" numeric DEFAULT '0',
	"total" numeric NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"contract_number" integer NOT NULL,
	"name" text,
	"client_id" uuid NOT NULL,
	"quote_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"billing_period" "billing_period" DEFAULT 'mensual',
	"next_billing_date" date,
	"status" "contract_status" DEFAULT 'pendiente_activacion',
	"payment_status" "payment_status" DEFAULT 'pendiente',
	"subtotal" numeric DEFAULT '0',
	"iva_total" numeric DEFAULT '0',
	"total" numeric DEFAULT '0',
	"notes" text,
	"document_url" text,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"entity_type" text NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"sender_email" text NOT NULL,
	"sender_name" text,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"subject" text NOT NULL,
	"body_preview" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"attachment_count" integer DEFAULT 0,
	"entity_type" text,
	"entity_id" uuid,
	"provider" text DEFAULT 'smtp' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"smtp_host" text NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_user" text NOT NULL,
	"smtp_password" text NOT NULL,
	"smtp_secure" boolean DEFAULT true,
	"from_email" text NOT NULL,
	"from_name" text,
	"signature_html" text,
	"provider" text DEFAULT 'smtp',
	"is_active" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"template_type" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"entity_name" text NOT NULL,
	"display_name" text NOT NULL,
	"icon" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entity_configurations_entity_name_unique" UNIQUE("entity_name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"expense_number" text NOT NULL,
	"supplier_name" text NOT NULL,
	"supplier_cif" text,
	"invoice_number" text,
	"id_factura" text,
	"concept" text,
	"issue_date" date NOT NULL,
	"due_date" date,
	"subtotal" numeric DEFAULT '0',
	"iva_percent" numeric DEFAULT '21.00',
	"iva_amount" numeric DEFAULT '0',
	"irpf_percent" numeric DEFAULT '0',
	"irpf_amount" numeric DEFAULT '0',
	"total" numeric DEFAULT '0',
	"currency" text DEFAULT 'EUR',
	"status" text DEFAULT 'pending',
	"document_url" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "expenses_expense_number_unique" UNIQUE("expense_number")
);
--> statement-breakpoint
CREATE TABLE "gmail_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp with time zone,
	"email_address" text,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_calendar_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp with time zone,
	"calendar_id" text DEFAULT 'primary',
	"sync_enabled" boolean DEFAULT false,
	"sync_direction" text DEFAULT 'both',
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "google_calendar_config_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric NOT NULL,
	"discount_percent" numeric DEFAULT '0',
	"discount_amount" numeric DEFAULT '0',
	"subtotal" numeric NOT NULL,
	"iva_percent" numeric DEFAULT '21.00',
	"iva_amount" numeric DEFAULT '0',
	"total" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"invoice_number" integer NOT NULL,
	"client_id" uuid NOT NULL,
	"contract_id" uuid,
	"remittance_id" uuid,
	"issue_date" date DEFAULT 'now()' NOT NULL,
	"due_date" date,
	"status" "invoice_status" DEFAULT 'borrador',
	"subtotal" numeric DEFAULT '0',
	"iva_percent" numeric DEFAULT '21.00',
	"iva_amount" numeric DEFAULT '0',
	"irpf_percent" numeric DEFAULT '0',
	"irpf_amount" numeric DEFAULT '0',
	"total" numeric DEFAULT '0',
	"notes" text,
	"document_url" text,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"client_id" uuid,
	"status" text DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"description" text,
	"days_threshold" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"primary_color" text DEFAULT '#3366cc',
	"secondary_color" text DEFAULT '#666666',
	"accent_color" text DEFAULT '#0066cc',
	"show_logo" boolean DEFAULT true,
	"logo_position" text DEFAULT 'left',
	"show_iban_footer" boolean DEFAULT true,
	"show_notes" boolean DEFAULT true,
	"show_discounts_column" boolean DEFAULT true,
	"header_style" text DEFAULT 'classic',
	"font_size_base" integer DEFAULT 10,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"phone" text,
	"language" text DEFAULT 'es',
	"timezone" text DEFAULT 'Europe/Madrid',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "quote_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric NOT NULL,
	"discount_percent" numeric DEFAULT '0',
	"discount_amount" numeric DEFAULT '0',
	"subtotal" numeric NOT NULL,
	"iva_percent" numeric DEFAULT '21.00',
	"iva_amount" numeric DEFAULT '0',
	"total" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"quote_number" integer NOT NULL,
	"name" text,
	"client_id" uuid,
	"contact_id" uuid,
	"status" "quote_status" DEFAULT 'borrador',
	"valid_until" date,
	"subtotal" numeric DEFAULT '0',
	"iva_total" numeric DEFAULT '0',
	"total" numeric DEFAULT '0',
	"notes" text,
	"document_url" text,
	"is_sent" boolean DEFAULT false,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remittance_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"remittance_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"payment_date" date DEFAULT 'now()' NOT NULL,
	"status" text DEFAULT 'cobrado' NOT NULL,
	"return_reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"remittance_number" integer NOT NULL,
	"code" text,
	"issue_date" date DEFAULT 'now()' NOT NULL,
	"status" "remittance_status" DEFAULT 'pendiente',
	"total_amount" numeric DEFAULT '0',
	"invoice_count" integer DEFAULT 0,
	"collection_date" date,
	"sent_to_bank_at" timestamp with time zone,
	"paid_amount" numeric DEFAULT '0',
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"notes" text,
	"xml_file_url" text,
	"n19_file_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"service_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"price" numeric DEFAULT '0' NOT NULL,
	"iva_percent" numeric DEFAULT '21.00',
	"status" "service_status" DEFAULT 'activo',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_table_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_name" text NOT NULL,
	"view_name" text NOT NULL,
	"visible_columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"column_order" jsonb DEFAULT '[]'::jsonb,
	"filters" jsonb DEFAULT '{}'::jsonb,
	"sort_config" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ba_account" ADD CONSTRAINT "ba_account_user_id_ba_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ba_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_invitation" ADD CONSTRAINT "ba_invitation_organization_id_ba_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."ba_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_invitation" ADD CONSTRAINT "ba_invitation_inviter_id_ba_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."ba_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_member" ADD CONSTRAINT "ba_member_organization_id_ba_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."ba_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_member" ADD CONSTRAINT "ba_member_user_id_ba_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ba_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ba_session" ADD CONSTRAINT "ba_session_user_id_ba_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ba_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_category_id_calendar_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."calendar_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notification_preferences" ADD CONSTRAINT "client_notification_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_services" ADD CONSTRAINT "contract_services_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_services" ADD CONSTRAINT "contract_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_services" ADD CONSTRAINT "invoice_services_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_services" ADD CONSTRAINT "invoice_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_services" ADD CONSTRAINT "quote_services_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_services" ADD CONSTRAINT "quote_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remittance_payments" ADD CONSTRAINT "remittance_payments_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remittance_payments" ADD CONSTRAINT "remittance_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;