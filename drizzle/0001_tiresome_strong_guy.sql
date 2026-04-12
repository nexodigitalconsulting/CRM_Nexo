CREATE TYPE "public"."flow_status" AS ENUM('active', 'paused', 'inactive');--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"n8n_workflow_id" text,
	"status" "flow_status" DEFAULT 'inactive',
	"trigger_type" text DEFAULT 'manual',
	"last_run_at" timestamp with time zone,
	"execution_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remittance_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"remittance_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	"added_by" uuid
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "dashboard_config" jsonb;--> statement-breakpoint
ALTER TABLE "remittance_invoices" ADD CONSTRAINT "remittance_invoices_remittance_id_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."remittances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remittance_invoices" ADD CONSTRAINT "remittance_invoices_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;