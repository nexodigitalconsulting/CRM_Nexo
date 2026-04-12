# ROADMAP DE DESARROLLO — CRM Suite v2.0
**Versión:** 2.0
**Fecha inicio:** Abril 2026
**Objetivo:** Migrar de v1 (single-tenant, Vite) a v2 (multi-tenant, Next.js)

---

## Contexto estratégico

Este roadmap refleja las decisiones del análisis estratégico (`ANALISIS-ESTRATEGICO.md`):

- **0–5 clientes:** Priorizar Fases 0b y 0 (fixes sobre v1 actual + script réplica) antes de cualquier refactor
- **5–15 clientes:** Fases 1–2 (Next.js + Neon) desbloquean precio más competitivo y reducen infra/cliente de €12 a €6
- **15+ clientes:** Fases 3–5 (multi-tenant completo) escalan el negocio con coste marginal ~€3/cliente

> **Regla práctica:** No iniciar la siguiente fase hasta tener al menos 3 clientes de pago activos en la fase anterior. El desarrollo no es el cuello de botella — las ventas sí.

## Resumen Ejecutivo

| Fase | Nombre | Duración | Prioridad | Trigger para iniciar |
|------|--------|----------|-----------|---------------------|
| 0b | Fixes deploy actual (versiones, variables) | 1 día | URGENTE HOY | — |
| 0 | Seguridad (credentials, CORS) | 2 días | URGENTE HOY | — |
| 0c | Script réplica + fix Flows + bundle | 3 días | ALTA | — |
| 1 | Next.js base + Drizzle setup | 3 días | ALTA | 3+ clientes activos |
| M1 | Migración Supabase client → Drizzle ORM | 5 días | ALTA | Con Fase 1 |
| M2 | Migración Auth → Better Auth | 2 días | ALTA | Con Fase M1 |
| M3 | Edge Functions → API Routes Next.js | 4 días | ALTA | Con Fase M2 |
| M4 | Storage → Cloudflare R2 | 1 día | ALTA | Con Fase M3 |
| 2 | Interfaz profesional | 6 días | MEDIA | v2 en staging con paridad |
| 3 | Multi-tenant completo (org_id) | 8 días | MEDIA | 8+ clientes activos |
| 4 | Configuración por cliente | 5 días | MEDIA | Con Fase 3 |
| 5 | CI/CD + automatizaciones | 4 días | MEDIA | Con Fase 3 |
| **Total** | | **~44 días hábiles** | | |

---

## FASE 0b — Correcciones al Sistema de Deploy Actual (1 día)

> Correcciones técnicas al sistema de infraestructura existente (Dockerfile + scripts bash + Edge Functions). Independiente de la migración a Next.js — deben hacerse sobre v1 ya mismo.

### Inconsistencias de versión en scripts bash

Los siguientes archivos tienen versiones hardcodeadas desactualizadas respecto a la versión real del schema (`v1.12.0`):

- [ ] **0b.1** `easypanel/scripts/startup.sh`: cambiar `CODE_SCHEMA_VERSION="v1.4.0"` → `"v1.12.0"`
- [ ] **0b.2** `easypanel/scripts/post-deploy.sh`: cambiar `TARGET_VERSION="v1.3.0"` → `"v1.12.0"`
- [ ] **0b.3** `supabase/functions/db-migrate/index.ts`: cambiar `CURRENT_VERSION = "v1.9.0"` → `"v1.12.0"` + añadir entradas de `v1.10.0`, `v1.11.0`, `v1.12.0` al array `MIGRATIONS`
- [ ] **0b.4** `src/lib/schemaChecker.ts`: cambiar `TARGET_VERSION = "v1.7.0"` → `"v1.12.0"` + añadir tablas faltantes a `REQUIRED_TABLES`
- [ ] **0b.5** `supabase/functions/version.json`: actualizar `"version": "1.9.0"` → `"1.12.0"` y añadir funciones al changelog

### Unificación de variables de Edge Functions

- [ ] **0b.6** Unificar `EDGE_FUNCTIONS_VOLUME` y `SUPABASE_FUNCTIONS_VOLUME` — los scripts `sync-edge-functions.sh` y `post-deploy.sh` usan variables distintas para el mismo propósito. Decidir un nombre canónico (`SUPABASE_FUNCTIONS_VOLUME`) y actualizar ambos scripts.

### Config Deno inconsistente

- [ ] **0b.7** `supabase/functions/db-migrate/index.ts` importa `@supabase/supabase-js@2.49.1` mientras que `send-email/index.ts` usa `npm:@supabase/supabase-js@2.86.0`. Unificar a `npm:@supabase/supabase-js@2.86.0` en todas las funciones.
- [ ] **0b.8** `supabase/functions/main/index.ts` tiene `FUNCTIONS_CONFIG` con JWT settings que puede divergir de `supabase/config.toml`. Sincronizar ambos archivos.

### Seguridad en código de frontend

- [ ] **0b.9** `src/components/MigrationGate.tsx` contiene nombres de proyecto reales de Easypanel (`mangas`, `nexo_n8n`) en comentarios de código. Reemplazar con placeholders `PROYECTO`.
- [ ] **0b.10** El comando de copiar en MigrationGate.tsx tiene `mangas_crm-web` hardcodeado. Hacer el nombre de proyecto configurable via `VITE_EASYPANEL_PROJECT` o similar.

### Documentación de deploy

- [ ] **0b.11** Añadir al `easypanel/README.md` la sección completa de "Mounts necesarios" con las rutas exactas:
  ```
  Host: /etc/easypanel/projects/PROYECTO/supabase/code/volumes/functions
  Container: /supabase-functions
  ```
- [ ] **0b.12** Crear `easypanel/README-edge-functions.md` específico para el flujo bash de deploy de funciones.

### Entregables
- [ ] Scripts bash con versiones correctas
- [ ] Variable de Edge Functions unificada
- [ ] MigrationGate sin nombres de proyecto reales
- [ ] README actualizado con mounts exactos

---

## FASE 0c — Rentabilidad inmediata del producto (3 días)

> Estas son las tareas de mayor ROI a corto plazo. Impactan directamente en ventas y en el tiempo (= coste) de desplegar cada cliente nuevo.

### Fix crítico: Flows.tsx con datos reales

La página `/flows` muestra actualmente **datos hardcodeados** con IDs de workflow n8n ficticios (`workflow_123`, `workflow_456`). Si un cliente accede a esta pantalla, la promesa de "integración con n8n" queda en evidencia como vacía.

- [ ] **0c.1** Opción A (rápida, 4 horas): Deshabilitar el módulo de Flujos del sidebar hasta que esté implementado correctamente. Mostrar pantalla "Próximamente: automatización n8n".
- [ ] **0c.2** Opción B (correcta, 3 días): Conectar realmente con la API de n8n via webhook configurado en Settings. Lista de workflows reales, estado activo/pausa, historial de ejecuciones.

> **Recomendación:** Implementar Opción A hoy (4 horas), planificar Opción B como feature de módulo Pro.

### Script de réplica automatizado

- [ ] **0c.3** Crear `easypanel/scripts/new-client.sh` según la propuesta en `REPLICA-CLIENTE.md`
- [ ] **0c.4** Probar el script contra un cliente de prueba en el VPS real
- [ ] **0c.5** Documentar en `easypanel/README.md` el flujo completo de "nuevo cliente en < 1 hora"
- [ ] **0c.6** Crear carpeta `.clients/` con template de `.env` por cliente (añadir al `.gitignore`)

### Mejora inmediata de rendimiento

- [ ] **0c.7** Añadir `manualChunks` en `vite.config.ts` para separar pdf-lib + fabric (~800 KB) del bundle principal. Resultado esperado: bundle inicial de 2.5 MB → ~800 KB.
- [ ] **0c.8** Reducir timeout del MigrationGate de 8 a 3 segundos. Si hay timeout, entrar al CRM con banner informativo en vez de bloquear.

### Entregables
- [ ] Módulo Flows deshabilitado o conectado a n8n real
- [ ] Script `new-client.sh` funcional y documentado
- [ ] Bundle JS mejorado (medible con Lighthouse)
- [ ] MigrationGate no bloquea en cold start

---

## FASE 0 — Preparación y Seguridad (2 días)

> Correcciones críticas que deben hacerse ANTES de continuar el desarrollo.

### Tareas

- [ ] **0.1** Eliminar `.env` del repositorio y añadirlo a `.gitignore`
- [ ] **0.2** Rotar las claves de Supabase expuestas (anon key + service key) desde el dashboard
- [ ] **0.3** Eliminar `DEFAULT_SUPABASE_URL` y `DEFAULT_SUPABASE_ANON_KEY` hardcodeados en `src/integrations/supabase/client.ts`
- [ ] **0.4** Hacer obligatorias las variables de entorno con validación en startup
- [ ] **0.5** Restringir CORS en todas las Edge Functions al dominio de producción
- [ ] **0.6** Eliminar `DEBUG_VITE_SUPABASE_URL` del Dockerfile (no imprimir credenciales en logs)
- [ ] **0.7** Crear `.env.example` con todas las variables necesarias (sin valores reales)
- [ ] **0.8** Documentar proceso de rotación de claves en `docs/SEGURIDAD.md`

### Entregables
- `.env.example` documentado
- Repo limpio sin credenciales
- Claves rotadas en Supabase

---

## FASE 1 — Setup Next.js + Drizzle Base ✅ COMPLETADA (Abril 2026)

> Stack definitivo: **Next.js 15 App Router + PostgreSQL + Better Auth + Cloudflare R2 + Drizzle ORM**. Deploy en Easypanel.

### 1.1 Setup Next.js + Drizzle ✅

- [x] Migrar proyecto `vps-crm-suite` a Next.js 15 App Router (en repo existente)
- [x] Configurar `next.config.ts` con `output: "standalone"`, `serverExternalPackages`
- [x] Actualizar `tsconfig.json` para Next.js (jsx: preserve, plugins: next)
- [x] Instalar y configurar Drizzle ORM (`drizzle-orm`, `pg`, `drizzle-kit`)
- [x] Crear `src/lib/db.ts` — conexión Drizzle via `DATABASE_URL`
- [x] Añadir tablas Better Auth (`ba_*`) al schema Drizzle existente
- [x] Crear `app/` con layout raíz, loading, error, not-found

### 1.2 Setup Better Auth ✅

- [x] Instalar `better-auth` con plugin de organización (multi-tenant)
- [x] Crear `src/lib/auth.ts` — instancia servidor con Drizzle adapter
- [x] Crear `src/lib/auth-client.ts` — cliente React con `organizationClient`
- [x] Crear `app/api/auth/[...all]/route.ts` — handler GET + POST
- [x] Crear `middleware.ts` — protección de rutas (redirige a `/auth` sin sesión)
- [x] Actualizar `src/lib/api/auth.ts` — wraps Better Auth client
- [x] Actualizar `src/hooks/useAuth.tsx` — usa `useSession()` de Better Auth

### 1.3 App Router + Migración de páginas ✅

- [x] Crear estructura `app/(app)/` con layout protegido
- [x] 16 rutas creadas como thin wrappers sobre `src/pages/*.tsx`
- [x] `react-router-dom` → `next/navigation` en todos los archivos afectados
- [x] `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*` en todos los archivos
- [x] `"use client"` añadido a todos los componentes interactivos
- [x] `src/components/Providers.tsx` creado (QueryClient + AuthProvider + UI)

### 1.4 Cloudflare R2 ✅

- [x] Instalar `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- [x] Crear `src/lib/storage.ts` — `uploadFile`, `getSignedReadUrl`, `deleteFile`
- [x] Crear `app/api/upload/logo/route.ts` — endpoint protegido para subir logos
- [x] Actualizar `src/lib/api/settings.ts` — `uploadCompanyLogo` usa `/api/upload/logo`

### 1.5 Infraestructura ✅

- [x] Reescribir `Dockerfile` para Next.js standalone (multi-stage, node:20-alpine)
- [x] Crear `.env.example` con todas las variables nuevas (`DATABASE_URL`, `BETTER_AUTH_*`, `R2_*`)
- [x] Eliminar referencias a Vite, nginx, supabase-functions del Dockerfile

### Criterios de completitud
- [x] Estructura Next.js App Router creada
- [x] Better Auth configurado servidor + cliente
- [x] R2 storage operativo
- [x] Dockerfile actualizado para Node.js runtime
- [ ] `npm run dev` arranca sin errores con `.env` local *(pendiente: instalar deps en VPS)*
- [ ] Login/logout funciona con Better Auth *(pendiente: BD PostgreSQL apuntada)*
- [ ] Drizzle conecta y las tablas ba_* existen en la BD *(pendiente: `db:migrate`)*

---

## FASE M1 — Migración Supabase Client → Drizzle ORM (5 días)

> Reemplazar todos los usos de `supabase.from('tabla').select()` por queries Drizzle type-safe. Este es el mayor volumen de código a cambiar. **Archivos específicos del repo actual a tocar:**

### Archivos a ELIMINAR

- [ ] `src/integrations/supabase/client.ts` — cliente Supabase con fallback hardcodeado
- [ ] `src/lib/schemaChecker.ts` — Drizzle gestiona el schema automáticamente
- [ ] `src/components/MigrationGate.tsx` — ya no hay schema que verificar manualmente

### Hooks a migrar (25+ archivos en `src/hooks/`)

Cada hook usa `supabase.from()` — debe reescribirse usando las query functions de `lib/db/queries/`. Esfuerzo estimado por módulo:

| Archivo(s) en `src/hooks/` | Módulo | Estimación | Notas |
|---------------------------|--------|-----------|-------|
| `useClients.ts` (o similar) | Clients | 3h | CRUD + búsqueda + conteo |
| `useContacts.ts` | Contacts | 2h | CRUD + filtros por cliente |
| `useInvoices.ts` | Invoices | 4h | CRUD + filtros estado + cálculos |
| `useInvoiceItems.ts` | Invoice items | 1h | Sub-queries |
| `useContracts.ts` | Contracts | 2h | CRUD + renovaciones |
| `useQuotes.ts` | Quotes | 2h | CRUD + conversión a factura |
| `useExpenses.ts` | Expenses | 2h | CRUD + categorías |
| `useRemittances.ts` | Remittances | 4h | CRUD + SEPA + payments |
| `useCampaigns.ts` | Campaigns | 2h | CRUD + estados |
| `useServices.ts` | Services | 1h | CRUD simple |
| `useCalendar.ts` | Calendar | 2h | CRUD + filtros fecha |
| `useDashboard.ts` | Dashboard | 3h | Aggregate queries múltiples |
| `useSettings.ts` / `useCompanySettings.ts` | Settings | 2h | CRUD config empresa |
| `useEmailSettings.ts` | Email config | 1h | CRUD |
| `useEmailLogs.ts` | Email logs | 1h | Read-only + filtros |
| `useNotifications.ts` | Notifications | 1h | Read + mark-as-read |
| `usePdfTemplates.ts` | PDF templates | 1h | CRUD |
| `useDashboardWidgets.ts` | Widgets | 1h | CRUD + ordering |
| **TOTAL** | | **~35h (~4.5 días)** | |

### Proceso de migración por hook (patrón repetible)

```typescript
// ANTES (src/hooks/useClients.ts — v1):
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// DESPUÉS (lib/db/queries/clients.ts — v2):
const clients = await clientsDb.list({ page, pageSize, search });
// clientsDb.list() usa Drizzle con org_id inyectado por middleware
```

### Criterios de completitud

- [ ] Cero imports de `@supabase/supabase-js` en el código fuente
- [ ] Todos los módulos del CRM muestran datos correctos
- [ ] Tests de integración pasan contra BD de test

---

## FASE M2 — Migración Auth → Better Auth (2 días)

> Reemplazar `supabase.auth.*` por el cliente de Better Auth. **Archivos específicos a tocar:**

### Archivos a modificar

- [ ] **`src/hooks/useAuth.tsx`** — reescribir completamente:
  ```typescript
  // ANTES: supabase.auth.getUser(), supabase.auth.signInWithPassword()
  // DESPUÉS: authClient.useSession(), authClient.signIn.email()
  ```
  - Eliminar el workaround `setTimeout(() => fetchUserRoles(), 0)` — los roles vienen del JWT de Better Auth
  - Los 4 roles (`admin`, `manager`, `user`, `readonly`) se mapean a los roles de `organization.member`

- [ ] **`src/pages/Auth.tsx`** (o equivalente) — adaptar formularios de login/register a la API de Better Auth

- [ ] **`src/components/ProtectedRoute.tsx`** (si existe) — reemplazar con middleware de Next.js

- [ ] **Cualquier archivo** que use `supabase.auth.onAuthStateChange()` — reemplazar con `authClient.useSession()` (React hook reactivo)

- [ ] **`src/integrations/supabase/client.ts`** — ya se elimina en Fase M1

### Nuevas variables de entorno (reemplazando variables Supabase)

```bash
# Añadir a .env.example:
BETTER_AUTH_SECRET=   # openssl rand -base64 32
BETTER_AUTH_URL=      # URL pública del CRM

# Eliminar de .env.example:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

### Criterios de completitud

- [ ] Login, logout, reset password funcionan con Better Auth
- [ ] Los roles de usuario se mantienen (`admin`, `manager`, `user`, `readonly`)
- [ ] Las rutas protegidas redirigen correctamente a `/auth/login`
- [ ] Cero referencias a `supabase.auth.*` en el código

---

## FASE M3 — Edge Functions → API Routes Next.js (4 días)

> Migrar las 13 Edge Functions Deno a API Routes de Next.js. Las funciones `main`, `db-migrate` y `setup-database` se eliminan por completo. **Archivos específicos:**

### Funciones a ELIMINAR (no tienen equivalente en v2)

| Archivo | Motivo |
|---------|--------|
| `supabase/functions/main/index.ts` | El dispatcher Deno no existe en Next.js |
| `supabase/functions/db-migrate/index.ts` | Drizzle gestiona migraciones |
| `supabase/functions/setup-database/index.ts` | Drizzle gestiona schema |

### Funciones a MIGRAR (Deno → Node.js API Routes)

| Función original | API Route nueva | Esfuerzo | Cambio principal |
|----------------|----------------|---------|-----------------|
| `supabase/functions/ping/index.ts` | `app/api/health/route.ts` | 1h | Response JSON trivial |
| `supabase/functions/send-email/index.ts` | `app/api/email/send/route.ts` | 4h | Deno SMTP → Nodemailer |
| `supabase/functions/bootstrap-admin/index.ts` | `app/api/admin/bootstrap/route.ts` | 3h | Supabase admin → Better Auth API |
| `supabase/functions/process-notifications/index.ts` | `app/api/notifications/process/route.ts` | 4h | supabase-js → Drizzle queries |
| `supabase/functions/google-calendar-auth/index.ts` | `app/api/calendar/auth/route.ts` | 3h | Mismo OAuth, diferente runtime |
| `supabase/functions/google-calendar-callback/index.ts` | `app/api/calendar/callback/route.ts` | 3h | Mismo OAuth |
| `supabase/functions/google-calendar-events/index.ts` | `app/api/calendar/events/route.ts` | 3h | Mismo fetch Google API |
| `supabase/functions/gmail-oauth-auth/index.ts` | `app/api/gmail/auth/route.ts` | 2h | Mismo OAuth |
| `supabase/functions/gmail-oauth-callback/index.ts` | `app/api/gmail/callback/route.ts` | 2h | Mismo OAuth |
| `supabase/functions/calendar-ical/index.ts` | `app/api/calendar/ical/route.ts` | 3h | Mismo iCal, Drizzle queries |
| **Total** | | **~28h (~3.5 días)** | |

### Patrón de migración

```typescript
// ANTES (supabase/functions/send-email/index.ts — Deno):
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";
serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: config } = await supabase.from('email_settings').select('*').single();
  // ... SMTP con Deno
});

// DESPUÉS (app/api/email/send/route.ts — Next.js):
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db/client";
import { emailSettings } from "@packages/db/schema";
import { eq } from "drizzle-orm";
export async function POST(request: NextRequest) {
  const orgId = request.headers.get("x-org-id")!;
  const [config] = await db.select().from(emailSettings).where(eq(emailSettings.orgId, orgId));
  // ... SMTP con Nodemailer
}
```

### Dependencias nuevas a añadir

```bash
npm install nodemailer @types/nodemailer     # para send-email
npm install googleapis                        # para google-calendar-* (igual que en Deno)
npm install ical-generator                    # para calendar-ical (similar a Deno)
```

### Criterios de completitud

- [ ] Directorio `supabase/functions/` puede eliminarse del repo
- [ ] Todos los endpoints funcionan en Next.js
- [ ] No hay referencias a `EDGE_FUNCTIONS_VOLUME` ni `EDGE_RUNTIME_CONTAINER` en ningún script

---

## FASE M4 — Storage → Cloudflare R2 (1 día)

> Reemplazar Supabase Storage por Cloudflare R2. **Archivos específicos:**

### Archivos a modificar

- [ ] Cualquier `supabase.storage.from('bucket').upload(...)` → `uploadToR2(key, body, contentType)`
- [ ] Cualquier `supabase.storage.from('bucket').getPublicUrl(...)` → URL directa de R2 o `getSignedDownloadUrl(key)`
- [ ] Cualquier `supabase.storage.from('bucket').createSignedUrl(...)` → `getSignedDownloadUrl(key, expiresIn)`
- [ ] Lógica de upload de logo en `Settings → Empresa` — adaptar al cliente R2
- [ ] Lógica de generación de PDF con attachments (si los adjunta a Storage)

### Nueva dependencia

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Nuevas variables de entorno a añadir al `.env.example`

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=      # opcional, si el bucket tiene acceso público
```

### Criterios de completitud

- [ ] Upload de logos funciona y se guarda en R2
- [ ] PDFs generados pueden descargarse desde URLs R2
- [ ] Cero referencias a `supabase.storage` en el código

---

## FASE 2 — Interfaz Profesional (6 días)

> Elevar el nivel visual y UX a estándar SaaS profesional.

### 2.1 Design System (2 días)

- [ ] Definir paleta de colores corporativa con variables CSS custom
- [ ] Definir tipografía (fuentes, tamaños, pesos)
- [ ] Crear tokens de diseño en `tailwind.config.ts`
- [ ] Modo oscuro completo y consistente
- [ ] Componente `StatusBadge` unificado para todos los estados
- [ ] Componente `StatCard` mejorado con tendencias
- [ ] Loading skeletons en todas las listas
- [ ] Empty states con illustraciones y acciones

### 2.2 DataTable profesional (2 días)

- [ ] Componente `DataTable` con:
  - Paginación server-side (no client-side)
  - Búsqueda con debounce 300ms
  - Filtros combinables por columna
  - Ordenación multi-columna
  - Selección múltiple con acciones en lote
  - Export a CSV/Excel desde servidor
  - Vistas guardadas por usuario
  - Columnas redimensionables
  - Sticky header
- [ ] Reemplazar todas las tablas existentes con el nuevo componente

### 2.3 Dashboard mejorado (1 día)

- [ ] KPIs en tiempo real con `refetchInterval`
- [ ] Gráfica de ingresos vs gastos (últimos 12 meses)
- [ ] Pipeline de contactos (kanban view)
- [ ] Widget de próximas facturas a vencer
- [ ] Widget de contratos próximos a renovar
- [ ] Drag & drop para reordenar widgets (react-grid-layout)
- [ ] Widgets configurables por usuario

### 2.4 Mejoras UX (1 día)

- [ ] Breadcrumbs en todas las páginas internas
- [ ] Comando palette con `⌘K` (buscar clientes, facturas, etc.)
- [ ] Notificaciones en tiempo real (Supabase Realtime)
- [ ] Onboarding wizard para nuevos tenants
- [ ] Tooltips de ayuda contextuales
- [ ] Accesos directos de teclado documentados

### Criterios de completitud
- [ ] Score de Lighthouse Performance > 85
- [ ] Responsive correcto en móvil (320px-768px)
- [ ] Sin errores de accesibilidad WCAG AA en páginas principales

---

## FASE 3 — Sistema Multi-Tenant (10 días)

> Transformar la arquitectura single-tenant en multi-tenant real.

### 3.1 Schema de base de datos (3 días)

- [ ] Crear tabla `organizations` (tenants)
- [ ] Crear tabla `organization_members` (usuarios por org)
- [ ] Añadir columna `org_id` a **todas** las tablas de datos:
  ```
  clients, contacts, services, campaigns, quotes, contracts,
  invoices, invoice_items, remittances, remittance_invoices,
  remittance_payments, expenses, calendar_events, email_settings,
  email_logs, notification_queue, pdf_templates, dashboard_widgets,
  table_views, entity_configurations, company_settings
  ```
- [ ] Reescribir todas las políticas RLS basándose en `org_id`
- [ ] Crear función `get_active_org_id()` para RLS
- [ ] Migración de datos existentes: asignar `org_id` a registros legacy
- [ ] Índices en `org_id` para todas las tablas
- [ ] Tests de aislamiento: verificar que tenant A no ve datos de tenant B

### 3.2 Resolución de tenant (2 días)

- [ ] Implementar resolución por subdominio (`cliente.crm.midominio.com`)
- [ ] Implementar resolución por path (`/org/cliente/...`) como alternativa
- [ ] Middleware Next.js que extrae y valida el `org_id`
- [ ] Inyectar `org_id` en headers para Server Components
- [ ] Custom claim en JWT de Supabase con el `org_id` activo
- [ ] Soporte para usuarios en múltiples organizaciones (selector de org)

### 3.3 Gestión de organizaciones (2 días)

- [ ] Panel de super-admin para gestionar tenants (acceso solo con rol `super_admin`)
- [ ] CRUD de organizaciones (crear, editar, suspender)
- [ ] Gestión de miembros por organización (invitar, cambiar rol, eliminar)
- [ ] Gestión de planes (starter, pro, enterprise) con feature flags
- [ ] Límites por plan (ej: max clientes, max usuarios)
- [ ] Página de invitación por email para nuevos miembros

### 3.4 Aislamiento de Edge Functions (1 día)

- [ ] Todas las Edge Functions deben extraer `org_id` del JWT y aplicarlo en queries
- [ ] `send-email` usa la configuración SMTP del tenant
- [ ] `generate-pdf` usa las plantillas del tenant
- [ ] `process-notifications` filtra por tenant

### 3.5 Isolación de almacenamiento (1 día)

- [ ] Supabase Storage con buckets privados por tenant: `org_{id}/logos/`, `org_{id}/attachments/`
- [ ] RLS en Storage basada en `org_id`
- [ ] URLs firmadas para archivos privados (facturas, contratos adjuntos)

### 3.6 Testing de multitenancy (1 día)

- [ ] Tests E2E con 2 tenants paralelos
- [ ] Verificar que login de tenant A no da acceso a datos de tenant B
- [ ] Tests de RLS en PostgreSQL directamente
- [ ] Tests de resolución de subdominio

### Criterios de completitud
- [ ] 2 tenants activos simultáneamente sin interferencia
- [ ] Audit: queries de un tenant nunca devuelven datos de otro
- [ ] Super-admin puede crear nuevo tenant en < 5 minutos

---

## FASE 4 — Sistema de Configuración por Cliente (5 días)

> Permitir que cada tenant personalice su CRM sin tocar código.

### 4.1 Panel de configuración avanzado (2 días)

- [ ] **Marca:** logo, nombre, colores primario y secundario
- [ ] **Facturación:** moneda, IVA, IRPF, prefijos de series, número inicial
- [ ] **Email:** SMTP completo, firma HTML, plantillas de email
- [ ] **Módulos:** activar/desactivar módulos por tenant
- [ ] **Idioma y zona horaria:** español/inglés/portugués, TZ
- [ ] **Integraciones:** Google Calendar, n8n webhook URL, Gmail OAuth
- [ ] Vista previa en tiempo real de cambios de marca
- [ ] Exportar/importar configuración en JSON

### 4.2 Plantillas PDF configurables (2 días)

- [ ] Editor visual de plantillas PDF por tenant (mantener Fabric.js pero server-side)
- [ ] Plantillas separadas para: factura, presupuesto, contrato
- [ ] Variables dinámicas: `{{cliente.nombre}}`, `{{factura.numero}}`, etc.
- [ ] Vista previa con datos reales del último registro
- [ ] Heredar plantilla base y sobrescribir elementos
- [ ] Versionado de plantillas (revertir a versión anterior)

### 4.3 Campos personalizados (1 día)

- [ ] Añadir campos extra a cualquier entidad (ej: "Sector" en clientes, "Referencia interna" en facturas)
- [ ] Tipos: texto, número, fecha, desplegable, checkbox
- [ ] Los campos aparecen en formularios y en exportaciones
- [ ] Los campos son filtrables en tablas

### Criterios de completitud
- [ ] Un usuario no-técnico puede personalizar completamente el CRM en < 30 minutos
- [ ] La configuración persiste entre sesiones y es independiente por tenant

---

## FASE 5 — Automatizaciones y Deploy (4 días)

> Automatizar el ciclo de vida: desde la creación de un tenant hasta el mantenimiento.

### 5.1 GitHub Actions CI/CD (1 día)

- [ ] `ci.yml`: lint + typecheck + tests en cada PR
- [ ] `deploy.yml`: build y push automático a Easypanel en merge a `main`
- [ ] Secrets en GitHub Actions (no en repo): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, etc.
- [ ] Notificación de deploy en Slack/Telegram (opcional)
- [ ] Rollback automático si health check falla tras deploy

### 5.2 Migraciones automatizadas (1 día)

- [ ] Migraciones en `supabase/migrations/` con nombres descriptivos
- [ ] `db-migrate` Edge Function se ejecuta automáticamente en startup
- [ ] Migraciones idempotentes (se pueden re-ejecutar sin error)
- [ ] Tabla `migration_history` para auditoría
- [ ] Script de rollback documentado

### 5.3 Automatizaciones de negocio (1 día)

- [ ] Cron mensual para generación automática de remesas SEPA
- [ ] Cron diario para notificaciones de facturas próximas a vencer
- [ ] Cron para contratos próximos a renovar (30/15/7 días antes)
- [ ] Webhooks n8n configurables por tenant (nueva factura, pago recibido, etc.)

### 5.4 Script de provisioning de nuevo cliente (1 día)

- [ ] Script CLI: `npm run create-tenant -- --name "Empresa ABC" --email "admin@abc.com"`
- [ ] El script crea la organización, configura SMTP de demostración, crea usuario admin
- [ ] Template de Easypanel para nueva instancia (si se prefiere instancia dedicada)
- [ ] Guía de onboarding en email automático al nuevo admin

### 5.5 Mejoras al sistema de deploy bash (1 día)

> Estas tareas mejoran el sistema actual sin depender de la migración a Next.js.

- [ ] Script `easypanel/scripts/new-client.sh` que automatice los pasos 1-6 del `REPLICA-CLIENTE.md`
- [ ] Parametrizar `PROYECTO` como variable de entorno en lugar de autodetección por grep de nombres de contenedor
- [ ] Health check script que ejecute todos los checks de `verify-deployment.sh` + `verify-edge-functions.sh` y produzca un informe JSON
- [ ] Mecanismo de rollback: guardar la versión anterior de Edge Functions antes de sobreescribir (ya existe en `deploy-functions.sh` con `.backup_TIMESTAMP`)
- [ ] Añadir al Dockerfile el reinicio del contenedor edge-runtime cuando se usa Método B (Docker socket) — actualmente el script lo hace pero no se garantiza la espera post-restart

### Criterios de completitud
- [ ] Desde `git push` hasta deploy en producción < 10 minutos
- [ ] Crear nuevo tenant tarda < 5 minutos (manual) o < 1 minuto (script)
- [ ] Crons verificados en producción durante 7 días

---

## Hitos y Fechas Objetivo

| Hito | Fecha objetivo | Criterio |
|------|---------------|----------|
| Fase 0 completada | Semana 1, Día 2 | Repo limpio, claves rotadas |
| v2 en staging con paridad funcional | Semana 3, Día 5 | Todos los módulos de v1 funcionan |
| UI profesional aprobada | Semana 4, Día 5 | Demo con cliente real aprobada |
| Primer tenant en v2 | Semana 6, Día 5 | 1 cliente real usando multi-tenant |
| Sistema de config completo | Semana 7, Día 5 | Tenant configura todo sin código |
| Deploy automático activo | Semana 8, Día 5 | CI/CD funcionando en producción |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Migración de datos legacy sin `org_id` | ALTA | ALTA | Script de migración con org "default" + revisión manual |
| Conflictos de RLS al añadir `org_id` | MEDIA | ALTA | Tests de aislamiento antes de producción |
| Regresiones en lógica SEPA compleja | MEDIA | ALTA | Tests unitarios previos a la migración |
| Performance con multi-tenant en misma BD | BAJA | MEDIA | Índices en `org_id`, monitorizar queries lentas |
| Usuarios actuales confundidos con nueva UI | MEDIA | MEDIA | Demo previa + onboarding in-app |

---

## Stack Final v2.0 — Definitivo

| Categoría | Tecnología | Versión | Reemplaza a |
|-----------|-----------|---------|------------|
| Framework | Next.js App Router | 14.x | React + Vite SPA |
| Lenguaje | TypeScript | 5.x | — (igual) |
| Estilos | Tailwind CSS + shadcn/ui | 3.x | — (igual) |
| Estado servidor | TanStack Query | 5.x | — (igual) |
| Formularios | React Hook Form + Zod | 7.x / 3.x | — (igual) |
| Base de datos | **PostgreSQL 15 directo** | 15+ | PostgreSQL via Supabase |
| ORM / acceso datos | **Drizzle ORM** | 0.30.x | `@supabase/supabase-js` + PostgREST |
| Auth | **Better Auth** | 1.x | Supabase GoTrue |
| Server-side logic | **Next.js API Routes** | (Next.js) | Edge Functions Deno |
| Storage | **Cloudflare R2** | S3-compatible | Supabase Storage |
| Containerización | **Docker + Node runner** | Alpine | Docker + Nginx |
| Orquestación | **Easypanel** | — | Easypanel (sin cambios) |
| CI/CD | GitHub Actions | — | — |
| Tests unitarios | Vitest | — | — |
| Tests E2E | Playwright | — | — |

### Dependencias eliminadas en v2

```
@supabase/supabase-js     → Drizzle ORM
supabase/gotrue           → Better Auth
supabase/postgrest        → Drizzle (queries directas)
supabase/edge-runtime     → Next.js API Routes
supabase/storage-api      → Cloudflare R2
supabase/studio           → (eliminado, no necesario en producción)
supabase/realtime         → (eliminado, no se usa en v1)
kong (gateway)            → Next.js middleware
```

### Dependencias añadidas en v2

```
drizzle-orm               ORM type-safe para PostgreSQL
drizzle-kit               CLI para migraciones
better-auth               Autenticación open-source
@aws-sdk/client-s3        Cliente R2 (S3-compatible)
nodemailer                Email (reemplaza Deno SMTP)
pg                        Driver PostgreSQL para Node.js
```
