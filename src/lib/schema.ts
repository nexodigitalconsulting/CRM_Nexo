// Drizzle ORM Schema - v2
// Refleja full-schema.sql con org_id añadido para multi-tenant (Fase 2)
// org_id es nullable en v1 → NOT NULL en v2 tras migración de datos

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const appRoleEnum = pgEnum("app_role", ["admin", "manager", "user", "readonly"]);
export const clientStatusEnum = pgEnum("client_status", ["activo", "inactivo"]);
export const clientSegmentEnum = pgEnum("client_segment", ["corporativo", "pyme", "autonomo", "particular"]);
export const contactStatusEnum = pgEnum("contact_status", ["nuevo", "contactado", "seguimiento", "descartado", "convertido"]);
export const contractStatusEnum = pgEnum("contract_status", ["vigente", "expirado", "cancelado", "pendiente_activacion"]);
export const billingPeriodEnum = pgEnum("billing_period", ["mensual", "trimestral", "anual", "unico", "otro"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pagado", "pendiente", "parcial", "reclamado"]);
export const quoteStatusEnum = pgEnum("quote_status", ["borrador", "enviado", "aceptado", "rechazado"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["borrador", "emitida", "pagada", "cancelada"]);
export const remittanceStatusEnum = pgEnum("remittance_status", ["pendiente", "enviada", "cobrada", "parcial", "devuelta", "anulada", "vencida"]);
export const serviceStatusEnum = pgEnum("service_status", ["activo", "inactivo", "desarrollo"]);
export const eventImportanceEnum = pgEnum("event_importance", ["alta", "media", "baja"]);

// ============================================
// TABLAS DE USUARIO (sin org_id — scoped por user_id)
// ============================================

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  language: text("language").default("es"),
  timezone: text("timezone").default("Europe/Madrid"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: appRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// TABLAS DE NEGOCIO (con org_id para multi-tenant)
// ============================================

export const companySettings = pgTable("company_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  name: text("name").notNull(),
  cif: text("cif"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").default("España"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  iban: text("iban"),
  bic: text("bic"),
  sepaCreditorId: text("sepa_creditor_id"),
  currency: text("currency").default("EUR"),
  language: text("language").default("es"),
  timezone: text("timezone").default("Europe/Madrid"),
  dateFormat: text("date_format").default("DD/MM/YYYY"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  contactNumber: integer("contact_number").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").default("web"),
  status: contactStatusEnum("status").default("nuevo"),
  meetingDate: timestamp("meeting_date", { withTimezone: true }),
  presentationUrl: text("presentation_url"),
  quoteUrl: text("quote_url"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  clientNumber: integer("client_number").notNull(),
  name: text("name").notNull(),
  cif: text("cif"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").default("España"),
  iban: text("iban"),
  bic: text("bic"),
  sepaMandateId: text("sepa_mandate_id"),
  sepaMandateDate: date("sepa_mandate_date"),
  sepaSequenceType: text("sepa_sequence_type").default("RCUR"),
  segment: clientSegmentEnum("segment").default("pyme"),
  status: clientStatusEnum("status").default("activo"),
  source: text("source"),
  notes: text("notes"),
  contactId: uuid("contact_id").references(() => contacts.id),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  serviceNumber: integer("service_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  price: numeric("price").notNull().default("0"),
  ivaPercent: numeric("iva_percent").default("21.00"),
  status: serviceStatusEnum("status").default("activo"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  quoteNumber: integer("quote_number").notNull(),
  name: text("name"),
  clientId: uuid("client_id").references(() => clients.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  status: quoteStatusEnum("status").default("borrador"),
  validUntil: date("valid_until"),
  subtotal: numeric("subtotal").default("0"),
  ivaTotal: numeric("iva_total").default("0"),
  total: numeric("total").default("0"),
  notes: text("notes"),
  documentUrl: text("document_url"),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const quoteServices = pgTable("quote_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  quantity: integer("quantity").default(1),
  unitPrice: numeric("unit_price").notNull(),
  discountPercent: numeric("discount_percent").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  subtotal: numeric("subtotal").notNull(),
  ivaPercent: numeric("iva_percent").default("21.00"),
  ivaAmount: numeric("iva_amount").default("0"),
  total: numeric("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  contractNumber: integer("contract_number").notNull(),
  name: text("name"),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  quoteId: uuid("quote_id").references(() => quotes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  billingPeriod: billingPeriodEnum("billing_period").default("mensual"),
  nextBillingDate: date("next_billing_date"),
  status: contractStatusEnum("status").default("pendiente_activacion"),
  paymentStatus: paymentStatusEnum("payment_status").default("pendiente"),
  subtotal: numeric("subtotal").default("0"),
  ivaTotal: numeric("iva_total").default("0"),
  total: numeric("total").default("0"),
  notes: text("notes"),
  documentUrl: text("document_url"),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const contractServices = pgTable("contract_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  quantity: integer("quantity").default(1),
  unitPrice: numeric("unit_price").notNull(),
  discountPercent: numeric("discount_percent").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  subtotal: numeric("subtotal").notNull(),
  ivaPercent: numeric("iva_percent").default("21.00"),
  ivaAmount: numeric("iva_amount").default("0"),
  total: numeric("total").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const remittances = pgTable("remittances", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  remittanceNumber: integer("remittance_number").notNull(),
  code: text("code"),
  issueDate: date("issue_date").notNull().default("now()"),
  status: remittanceStatusEnum("status").default("pendiente"),
  totalAmount: numeric("total_amount").default("0"),
  invoiceCount: integer("invoice_count").default(0),
  collectionDate: date("collection_date"),
  sentToBankAt: timestamp("sent_to_bank_at", { withTimezone: true }),
  paidAmount: numeric("paid_amount").default("0"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledReason: text("cancelled_reason"),
  notes: text("notes"),
  xmlFileUrl: text("xml_file_url"),
  n19FileUrl: text("n19_file_url"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  invoiceNumber: integer("invoice_number").notNull(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  remittanceId: uuid("remittance_id").references(() => remittances.id),
  issueDate: date("issue_date").notNull().default("now()"),
  dueDate: date("due_date"),
  status: invoiceStatusEnum("status").default("borrador"),
  subtotal: numeric("subtotal").default("0"),
  ivaPercent: numeric("iva_percent").default("21.00"),
  ivaAmount: numeric("iva_amount").default("0"),
  irpfPercent: numeric("irpf_percent").default("0"),
  irpfAmount: numeric("irpf_amount").default("0"),
  total: numeric("total").default("0"),
  notes: text("notes"),
  documentUrl: text("document_url"),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const remittancePayments = pgTable("remittance_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  remittanceId: uuid("remittance_id").notNull().references(() => remittances.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  amount: numeric("amount").notNull(),
  paymentDate: date("payment_date").notNull().default("now()"),
  status: text("status").notNull().default("cobrado"),
  returnReason: text("return_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by"),
});

export const invoiceServices = pgTable("invoice_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  description: text("description"),
  quantity: integer("quantity").default(1),
  unitPrice: numeric("unit_price").notNull(),
  discountPercent: numeric("discount_percent").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  subtotal: numeric("subtotal").notNull(),
  ivaPercent: numeric("iva_percent").default("21.00"),
  ivaAmount: numeric("iva_amount").default("0"),
  total: numeric("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  expenseNumber: text("expense_number").notNull().unique(),
  supplierName: text("supplier_name").notNull(),
  supplierCif: text("supplier_cif"),
  invoiceNumber: text("invoice_number"),
  idFactura: text("id_factura"),
  concept: text("concept"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal").default("0"),
  ivaPercent: numeric("iva_percent").default("21.00"),
  ivaAmount: numeric("iva_amount").default("0"),
  irpfPercent: numeric("irpf_percent").default("0"),
  irpfAmount: numeric("irpf_amount").default("0"),
  total: numeric("total").default("0"),
  currency: text("currency").default("EUR"),
  status: text("status").default("pending"),
  documentUrl: text("document_url"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  campaignNumber: integer("campaign_number").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  email: text("email"),
  phone: text("phone"),
  category: text("category"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  website: text("website"),
  placeId: text("place_id"),
  captureDate: date("capture_date"),
  status: text("status").default("active"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const calendarCategories = pgTable("calendar_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  importance: eventImportanceEnum("importance").default("media"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").default(false),
  categoryId: uuid("category_id").references(() => calendarCategories.id),
  importance: eventImportanceEnum("importance").default("media"),
  status: text("status").default("confirmed"),
  notes: text("notes"),
  reminderMinutes: integer("reminder_minutes"),
  recurrenceRule: text("recurrence_rule"),
  clientId: uuid("client_id").references(() => clients.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  isSyncedToGoogle: boolean("is_synced_to_google").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userAvailability = pgTable("user_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const googleCalendarConfig = pgTable("google_calendar_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  calendarId: text("calendar_id").default("primary"),
  syncEnabled: boolean("sync_enabled").default(false),
  syncDirection: text("sync_direction").default("both"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emailSettings = pgTable("email_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  smtpSecure: boolean("smtp_secure").default(true),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  signatureHtml: text("signature_html"),
  provider: text("provider").default("smtp"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const gmailConfig = pgTable("gmail_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  emailAddress: text("email_address"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  bodyPreview: text("body_preview"),
  attachments: jsonb("attachments").default([]),
  attachmentCount: integer("attachment_count").default(0),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  provider: text("provider").notNull().default("smtp"),
  status: text("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pdfSettings = pgTable("pdf_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  primaryColor: text("primary_color").default("#3366cc"),
  secondaryColor: text("secondary_color").default("#666666"),
  accentColor: text("accent_color").default("#0066cc"),
  showLogo: boolean("show_logo").default(true),
  logoPosition: text("logo_position").default("left"),
  showIbanFooter: boolean("show_iban_footer").default(true),
  showNotes: boolean("show_notes").default(true),
  showDiscountsColumn: boolean("show_discounts_column").default(true),
  headerStyle: text("header_style").default("classic"),
  fontSizeBase: integer("font_size_base").default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notificationRules = pgTable("notification_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(),
  description: text("description"),
  daysThreshold: integer("days_threshold").default(3),
  isActive: boolean("is_active").default(true),
  templateId: uuid("template_id").references(() => emailTemplates.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notificationQueue = pgTable("notification_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleType: text("rule_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  status: text("status").default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const clientNotificationPreferences = pgTable("client_notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  ruleType: text("rule_type").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables").default([]),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const entityConfigurations = pgTable("entity_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  entityName: text("entity_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  icon: text("icon"),
  fields: jsonb("fields").notNull().default([]),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userTableViews = pgTable("user_table_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  entityName: text("entity_name").notNull(),
  viewName: text("view_name").notNull(),
  visibleColumns: jsonb("visible_columns").notNull().default([]),
  columnOrder: jsonb("column_order").default([]),
  filters: jsonb("filters").default({}),
  sortConfig: jsonb("sort_config").default({}),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================
// RELACIONES (para joins con Drizzle)
// ============================================

export const clientsRelations = relations(clients, ({ one, many }) => ({
  contact: one(contacts, { fields: [clients.contactId], references: [contacts.id] }),
  invoices: many(invoices),
  contracts: many(contracts),
  quotes: many(quotes),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  contract: one(contracts, { fields: [invoices.contractId], references: [contracts.id] }),
  remittance: one(remittances, { fields: [invoices.remittanceId], references: [remittances.id] }),
  services: many(invoiceServices),
}));

export const invoiceServicesRelations = relations(invoiceServices, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceServices.invoiceId], references: [invoices.id] }),
  service: one(services, { fields: [invoiceServices.serviceId], references: [services.id] }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  quote: one(quotes, { fields: [contracts.quoteId], references: [quotes.id] }),
  services: many(contractServices),
  invoices: many(invoices),
}));

export const contractServicesRelations = relations(contractServices, ({ one }) => ({
  contract: one(contracts, { fields: [contractServices.contractId], references: [contracts.id] }),
  service: one(services, { fields: [contractServices.serviceId], references: [services.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  contact: one(contacts, { fields: [quotes.contactId], references: [contacts.id] }),
  services: many(quoteServices),
}));

export const quoteServicesRelations = relations(quoteServices, ({ one }) => ({
  quote: one(quotes, { fields: [quoteServices.quoteId], references: [quotes.id] }),
  service: one(services, { fields: [quoteServices.serviceId], references: [services.id] }),
}));

export const remittancesRelations = relations(remittances, ({ many }) => ({
  invoices: many(invoices),
  payments: many(remittancePayments),
}));

export const remittancePaymentsRelations = relations(remittancePayments, ({ one }) => ({
  remittance: one(remittances, { fields: [remittancePayments.remittanceId], references: [remittances.id] }),
  invoice: one(invoices, { fields: [remittancePayments.invoiceId], references: [invoices.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  category: one(calendarCategories, { fields: [calendarEvents.categoryId], references: [calendarCategories.id] }),
  client: one(clients, { fields: [calendarEvents.clientId], references: [clients.id] }),
  contact: one(contacts, { fields: [calendarEvents.contactId], references: [contacts.id] }),
  contract: one(contracts, { fields: [calendarEvents.contractId], references: [contracts.id] }),
}));

// ============================================
// TIPOS INFERIDOS
// ============================================

export type Client = typeof clients.$inferSelect;
export type ClientInsert = typeof clients.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type ContactInsert = typeof contacts.$inferInsert;
export type Service = typeof services.$inferSelect;
export type ServiceInsert = typeof services.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type QuoteInsert = typeof quotes.$inferInsert;
export type QuoteService = typeof quoteServices.$inferSelect;
export type QuoteServiceInsert = typeof quoteServices.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type ContractInsert = typeof contracts.$inferInsert;
export type ContractService = typeof contractServices.$inferSelect;
export type ContractServiceInsert = typeof contractServices.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceInsert = typeof invoices.$inferInsert;
export type InvoiceService = typeof invoiceServices.$inferSelect;
export type InvoiceServiceInsert = typeof invoiceServices.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseInsert = typeof expenses.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignInsert = typeof campaigns.$inferInsert;
export type Remittance = typeof remittances.$inferSelect;
export type RemittanceInsert = typeof remittances.$inferInsert;
export type RemittancePayment = typeof remittancePayments.$inferSelect;
export type RemittancePaymentInsert = typeof remittancePayments.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type CalendarEventInsert = typeof calendarEvents.$inferInsert;
export type CalendarCategory = typeof calendarCategories.$inferSelect;
export type CalendarCategoryInsert = typeof calendarCategories.$inferInsert;
export type CompanySettings = typeof companySettings.$inferSelect;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type PdfSettings = typeof pdfSettings.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type DocumentTemplateInsert = typeof documentTemplates.$inferInsert;
export type EntityConfiguration = typeof entityConfigurations.$inferSelect;
export type EntityConfigurationInsert = typeof entityConfigurations.$inferInsert;
export type UserTableView = typeof userTableViews.$inferSelect;
export type UserTableViewInsert = typeof userTableViews.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NotificationRule = typeof notificationRules.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;

// ============================================
// BETTER AUTH TABLES
// ============================================

export const baUser = pgTable("ba_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const baSession = pgTable("ba_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
});

export const baAccount = pgTable("ba_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const baVerification = pgTable("ba_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Organization plugin tables
export const baOrganization = pgTable("ba_organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: text("metadata"),
});

export const baMember = pgTable("ba_member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => baOrganization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const baInvitation = pgTable("ba_invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => baOrganization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: text("inviter_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
});

// Better Auth type exports
export type BaUser = typeof baUser.$inferSelect;
export type BaSession = typeof baSession.$inferSelect;
export type BaOrganization = typeof baOrganization.$inferSelect;
