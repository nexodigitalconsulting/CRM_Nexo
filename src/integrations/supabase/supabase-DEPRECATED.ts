/**
 * MIGRACIÓN SUPABASE → DRIZZLE — ESTADO FASE M1
 * ================================================
 *
 * Este archivo documenta el estado de la migración. NO importar `client.ts`
 * en código nuevo. Usar la capa de abstracción `src/lib/api/` en su lugar.
 *
 * ✅ MIGRADO A API LAYER (src/lib/api/)
 * ----------------------------------------
 * Los siguientes hooks ya NO usan supabase.from() directamente:
 *
 *   - useClients          → src/lib/api/clients.ts
 *   - useContacts         → src/lib/api/contacts.ts
 *   - useInvoices         → src/lib/api/invoices.ts
 *   - useContracts        → src/lib/api/contracts.ts
 *   - useQuotes           → src/lib/api/quotes.ts
 *   - useExpenses         → src/lib/api/expenses.ts
 *   - useCampaigns        → src/lib/api/campaigns.ts
 *   - useServices         → src/lib/api/services.ts
 *   - useRemittances      → src/lib/api/remittances.ts
 *   - useCalendarEvents   → src/lib/api/calendar.ts
 *   - useCompanySettings  → src/lib/api/settings.ts
 *   - useEmailSettings    → src/lib/api/email.ts
 *   - useEmailLogs        → src/lib/api/email-logs.ts
 *   - useDashboardWidgets → src/lib/api/dashboard.ts
 *   - useTableViews       → src/lib/api/table-views.ts
 *   - useEntityConfigurations → src/lib/api/entity-configurations.ts
 *   - usePdfSettings      → src/lib/api/settings.ts
 *   - usePdfTemplates     → src/lib/api/pdf-templates.ts
 *   - useDefaultTemplate  → src/lib/api/pdf-templates.ts
 *   - useProductAnalysis  → src/lib/api/product-analysis.ts (parcial)
 *   - useGoogleCalendar   → src/lib/api/google-calendar.ts
 *
 * ⏳ PENDIENTE — Fase M2: AUTH
 * ----------------------------------------
 * La autenticación aún usa Supabase Auth directamente:
 *   - src/hooks/useAuth.tsx          → supabase.auth.*
 *   - src/integrations/supabase/client.ts → supabase.auth.getSession()
 *
 * ✅ COMPLETADO — Fase M3: EDGE FUNCTIONS → fetch() directo
 * ----------------------------------------
 * Las siguientes funciones ya NO usan supabase.functions.invoke().
 * Usan fetch() directo a la URL de la edge function.
 * En Fase 1 (Next.js) solo hay que cambiar la URL base por /api/:
 *   - sendEmail / testEmailConnection  → fetch(`${SUPABASE_URL}/functions/v1/send-email`)
 *   - fetchGoogleCalendarEvents        → fetch(`${SUPABASE_URL}/functions/v1/google-calendar-events`)
 *   - getGoogleCalendarAuthUrl         → fetch(`${SUPABASE_URL}/functions/v1/google-calendar-auth`)
 *
 * ✅ COMPLETADO — Fase M4: STORAGE → fetch() directo a Storage REST API
 * ----------------------------------------
 * uploadCompanyLogo ya NO usa supabase.storage.
 * Usa fetch() directo a la Storage REST API de Supabase.
 * En Fase 1 (Next.js) solo hay que cambiar VITE_STORAGE_URL por la URL de R2/S3:
 *   - uploadCompanyLogo() → fetch(`${STORAGE_URL}/object/company-assets/${fileName}`)
 *   - Añadir VITE_STORAGE_URL al .env cuando se migre a Cloudflare R2 o AWS S3
 *
 * ⏳ PENDIENTE — Fase 1: NEXT.JS + DRIZZLE EN SERVIDOR
 * ----------------------------------------
 * La capa src/lib/api/ actualmente envuelve Supabase como cliente.
 * En Fase 1 (migración a Next.js), cada función en src/lib/api/ será
 * reemplazada por una llamada a /api/* que ejecutará Drizzle en el servidor.
 * Los hooks no necesitarán cambios gracias a la capa de abstracción.
 *
 * src/lib/db.ts     → Cliente Drizzle (Node.js, solo servidor)
 * src/lib/schema.ts → Esquema completo de todas las tablas
 * drizzle.config.ts → Configuración de migraciones
 *
 * Scripts disponibles:
 *   npm run db:generate  → Genera migraciones SQL desde schema.ts
 *   npm run db:migrate   → Aplica migraciones a la base de datos
 *   npm run db:studio    → Abre Drizzle Studio (explorador visual)
 */

// Este archivo es solo documentación. No exporta nada.
export {};
