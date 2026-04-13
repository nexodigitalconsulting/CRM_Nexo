# CRM Nexo v2.0

CRM completo para gestión de clientes, facturación, contratos y campañas.  
Stack: Next.js 15 App Router · Drizzle ORM · Better Auth · PostgreSQL.  
Sin Supabase — infraestructura 100% propia.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Base de datos | PostgreSQL + Drizzle ORM |
| Autenticación | Better Auth |
| UI | shadcn/ui + Tailwind CSS |
| Almacenamiento | Cloudflare R2 |
| Email | Nodemailer (SMTP) |
| Deploy | Docker · EasyPanel |

## Módulos

- **Clientes** — ficha completa, documentos, historial
- **Contactos** — agenda con conversión a cliente
- **Servicios** — catálogo con IVA y categorías
- **Presupuestos** — generación PDF, envío por email
- **Facturas** — numeración automática, remesas SEPA
- **Contratos** — renovaciones, facturación recurrente
- **Remesas** — XML SEPA (pain.008) y Norma 19
- **Campañas** — seguimiento de leads y conversiones
- **Gastos** — control de costes
- **Dashboard** — widgets configurables, pipeline de ventas
- **Calendario** — eventos, disponibilidad, sync Google
- **Configuración** — ajustes de empresa, plantillas PDF, email

---

## Instalación rápida

```bash
git clone https://github.com/nexodigitalconsulting/CRM_Nexo.git
cd CRM_Nexo
npm install
npm run setup        # asistente interactivo que crea .env
npm run db:migrate   # aplica el schema en tu base de datos
npm run dev
```

El asistente `npm run setup` genera automáticamente el `BETTER_AUTH_SECRET` y guía el resto de variables paso a paso.

---

## Variables de entorno

### Setup automático

```bash
npm run setup
```

Genera `BETTER_AUTH_SECRET` con `crypto.randomBytes(32)`, solicita el resto de forma interactiva y escribe el `.env` final.

---

### Referencia completa

#### Base de datos

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | **Sí** | Connection string PostgreSQL |

**Formato:**
```
postgresql://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_BD
```

**Cómo obtener según entorno:**

| Entorno | Pasos |
|---------|-------|
| **EasyPanel** | Crear servicio PostgreSQL → copiar *Internal Connection String* |
| **Supabase** | Settings → Database → URI (modo "Transaction pooler" recomendado) |
| **Neon** | Dashboard → Connection string |
| **Railway** | Servicio PostgreSQL → Variables → DATABASE_URL |
| **Local** | `postgresql://crm:crm@localhost:5432/Crm_Nexo` (con docker-compose) |

---

#### Autenticación — Better Auth

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `BETTER_AUTH_SECRET` | **Sí** | Clave de firma de tokens. Mín. 32 caracteres |
| `BETTER_AUTH_URL` | **Sí** | URL pública de la app (sin slash final) |
| `NEXT_PUBLIC_APP_URL` | **Sí** | Igual que `BETTER_AUTH_URL` (accesible en browser) |

**`BETTER_AUTH_SECRET` — generación:**

```bash
# Opción 1: con el asistente (recomendado)
npm run setup

# Opción 2: manual en terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 3: OpenSSL
openssl rand -hex 32

# Opción 4: EasyPanel
# En el campo de la variable → icono de dado → genera valor aleatorio
```

> **Importante:** Cambia este valor en producción. Si lo cambias, todas las sesiones activas se invalidan.

**`BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`:**

Debe ser la URL exacta donde está desplegada la app, incluyendo protocolo y sin slash final.  
Ejemplos: `https://crm.miempresa.com` · `https://crm-nexo.tuservidor.easypanel.host`

---

#### Cloudflare R2 — almacenamiento de archivos

Necesario para subir PDFs, documentos y adjuntos. Si no se configura, la funcionalidad de archivos queda desactivada.

| Variable | Descripción |
|----------|-------------|
| `R2_ACCOUNT_ID` | ID de tu cuenta Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key del token R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Key del token R2 |
| `R2_BUCKET_NAME` | Nombre del bucket (ej: `crm-nexo-assets`) |
| `R2_PUBLIC_URL` | URL pública del bucket |

**Cómo obtenerlo paso a paso:**

```
1. cloudflare.com → inicia sesión

2. ACCOUNT_ID:
   Página principal → barra lateral derecha → "Account ID" → copiar

3. Crear bucket:
   R2 → Create bucket → nombre: crm-nexo-assets → región: auto

4. Activar acceso público (para URLs de descarga):
   bucket → Settings → Public Access → Allow Access → Enable

5. R2_PUBLIC_URL:
   bucket → Settings → Public Access → copia la URL (ej: https://pub-abc123.r2.dev)
   O configura un dominio personalizado en "Custom Domains"

6. Crear API Token:
   My Profile → API Tokens → Create Token
   → Template: "Edit Cloudflare Workers"
   → Permisos adicionales: R2:Edit
   → Create Token → copia el valor (solo se muestra una vez)
   ⚠ Este valor va en R2_SECRET_ACCESS_KEY

7. R2_ACCESS_KEY_ID:
   R2 → Manage R2 API Tokens → Create API Token
   → Permissions: Object Read & Write
   → Specify bucket: crm-nexo-assets
   → Create → copia Access Key ID y Secret Access Key
```

---

#### SMTP — Email

Necesario para enviar facturas, presupuestos y notificaciones automáticas. Sin esto, el envío de emails queda desactivado.

| Variable | Descripción |
|----------|-------------|
| `SMTP_HOST` | Servidor SMTP |
| `SMTP_PORT` | Puerto (587 STARTTLS · 465 SSL) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña o API key SMTP |
| `SMTP_FROM` | Email del remitente |

**Proveedores recomendados:**

| Proveedor | Gratis | Configuración |
|-----------|--------|---------------|
| **Resend** | 100/día, 3000/mes | Host: `smtp.resend.com` · Puerto: `465` · User: `resend` · Pass: API key desde resend.com |
| **Brevo** | 300/día | Host: `smtp-relay.brevo.com` · Puerto: `587` · User: email cuenta · Pass: clave SMTP en Settings |
| **Gmail** | 500/día | Host: `smtp.gmail.com` · Puerto: `587` · User: tu@gmail.com · Pass: contraseña de aplicación |
| **Postmark** | 100/mes | Host: `smtp.postmarkapp.com` · Puerto: `587` · User: API key · Pass: API key |

**Obtener contraseña de aplicación Gmail:**
```
Google Account → Seguridad → Verificación en 2 pasos (activar) →
Contraseñas de aplicación → Seleccionar app: Correo → Generar
```

**Obtener API key Resend (más sencillo):**
```
resend.com → Signup gratis → API Keys → Create API Key → copiar
```

---

## Deploy en EasyPanel

### 1. Crear proyecto y servicio

1. EasyPanel → **+ Create Project** → nombre: `crm-nexo`
2. **+ New Service** → tipo **App**
3. **Source** → **GitHub** → autorizar → seleccionar repo `CRM_Nexo`, branch `main`
4. Build method: **Dockerfile** (detectado automáticamente)

### 2. Build Arguments

En la pestaña **Build** del servicio:

```
NEXT_PUBLIC_APP_URL     → https://tudominio.com
NEXT_PUBLIC_BETTER_AUTH_URL → https://tudominio.com
```

### 3. Environment Variables

En la pestaña **Environment**. Para `BETTER_AUTH_SECRET` usa el icono de dado de EasyPanel o ejecuta `openssl rand -hex 32`:

```
DATABASE_URL            → postgresql://... (de tu servicio PostgreSQL)
BETTER_AUTH_SECRET      → <genera con dado o openssl rand -hex 32>
BETTER_AUTH_URL         → https://tudominio.com
NEXT_PUBLIC_APP_URL     → https://tudominio.com

# Opcionales
R2_ACCOUNT_ID           → ...
R2_ACCESS_KEY_ID        → ...
R2_SECRET_ACCESS_KEY    → ...
R2_BUCKET_NAME          → crm-nexo-assets
R2_PUBLIC_URL           → https://pub-xxx.r2.dev

SMTP_HOST               → smtp.resend.com
SMTP_PORT               → 465
SMTP_USER               → resend
SMTP_PASS               → re_xxxxx (API key de Resend)
SMTP_FROM               → noreply@tudominio.com
```

### 4. Base de datos en EasyPanel

1. **+ New Service** → tipo **PostgreSQL**
2. Configura nombre de BD: `Crm_Nexo`, usuario y contraseña
3. Copia la **Internal Connection String**
4. Pégala en `DATABASE_URL` del servicio App

### 5. Dominio y SSL

**Domains** → Add domain → `tudominio.com` → EasyPanel provisiona Let's Encrypt automáticamente.

### 6. Primer deploy y migraciones

Tras el primer deploy, ejecuta las migraciones desde el terminal de EasyPanel:

```bash
npm run db:migrate
```

### 7. Auto Deploy

**Settings** → activar **Auto Deploy** → cada push a `main` redespliega automáticamente.

---

## Deploy local con Docker

```bash
# Build y arranque completo (app + PostgreSQL)
docker-compose up -d

# Aplicar schema
docker-compose exec app npm run db:migrate
```

La app quedará en `http://localhost:3000`.

---

## Scripts npm

```bash
npm run setup        # Asistente interactivo → crea/actualiza .env
npm run dev          # Desarrollo con HMR (Next.js)
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:generate  # Genera migraciones Drizzle desde schema
npm run db:migrate   # Aplica migraciones pendientes
npm run db:studio    # Drizzle Studio — UI visual de la BD
```

---

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   ├── auth/[...all]/    # Better Auth handler
│   │   ├── data/             # 50+ API routes (Drizzle)
│   │   │   ├── clients/
│   │   │   ├── invoices/
│   │   │   ├── remittances/
│   │   │   └── ...
│   │   ├── email/send/       # Envío SMTP
│   │   └── health/           # Health check
│   ├── (app)/                # Páginas protegidas
│   └── auth/                 # Login / registro
├── scripts/
│   └── setup-env.mjs         # Asistente de configuración
├── src/
│   ├── components/           # Componentes UI
│   ├── hooks/                # React Query hooks
│   ├── lib/
│   │   ├── api/              # Fetch helpers (cliente)
│   │   ├── api-server.ts     # Utils servidor (requireSession, nextSeq…)
│   │   ├── auth.ts           # Better Auth config
│   │   ├── db.ts             # Drizzle client
│   │   └── schema.ts         # Schema PostgreSQL completo
│   └── views/                # Vistas principales
├── .env.example              # Plantilla de variables
├── Dockerfile                # Multi-stage para EasyPanel
├── docker-compose.yml        # Dev local con PostgreSQL
├── drizzle.config.ts
└── next.config.ts
```

---

## Changelog

### v2.3.0 — 2026-04-13

#### Block B (mejorado) — Webcal Feed: sincronización real CRM → Google Calendar

**Arquitectura:** Feed ICS público con token de seguridad por usuario. Google Calendar sondea la URL automáticamente cada 6-24 h. Sin OAuth. Compatible con Google Calendar, Apple Calendar, Outlook y Thunderbird.

| Componente | Descripción |
|------------|-------------|
| `src/lib/schema.ts` | Columna `profiles.calendar_feed_token TEXT` — token único por usuario para autenticar el feed sin sesión |
| `drizzle/0002_melodic_fenris.sql` | Migración: `ALTER TABLE profiles ADD COLUMN calendar_feed_token text` |
| `app/api/calendar/feed/route.ts` | **Endpoint público** `GET /api/calendar/feed?token=xxx`. Sin session, autenticado por token. Devuelve `VCALENDAR` completo con todos los eventos del usuario: título, descripción, ubicación, all-day, recordatorios (VALARM), color de categoría, entidades vinculadas en DESCRIPTION. Headers `Content-Type: text/calendar` y `Cache-Control: no-cache`. |
| `app/api/data/profiles/calendar-token/route.ts` | `GET` devuelve (o genera) el token del usuario. `POST` rota el token (invalida la URL anterior). |
| `src/views/Settings.tsx` | Tab **"Calendario"** en Configuración con: URL webcal lista para copiar, botón "Abrir en Google Calendar" (enlace directo a `calendar.google.com/calendar/r/settings/addbyurl`), instrucciones paso a paso, rotación de token con confirmación, tabla de compatibilidad (Google, Apple, Outlook, Thunderbird). |

**Flujo:**
1. Usuario va a Configuración → Calendario → copia su URL `webcal://…`
2. La añade en Google Calendar una sola vez → "Otros calendarios → Desde URL"
3. Google la sondea cada 6-24 h — todos los eventos CRM aparecen en Google Calendar
4. Si crea/edita/borra un evento en el CRM → en el próximo sondeo Google lo actualiza
5. Cambios en Google **no** afectan al CRM (solo lectura)

---

### v2.2.0 — 2026-04-13

#### Block B — Google Calendar Export (CRM → Google, one-way)

**Arquitectura:** Sin OAuth, sin API de Google. Al crear/editar/borrar un evento en el CRM, el sistema genera un archivo `.ics` (RFC 5545) y lo envía por email al usuario. Gmail/Google Calendar detecta el adjunto y ofrece añadirlo al calendario automáticamente.

| Componente | Descripción |
|------------|-------------|
| `src/lib/ics.ts` | Generador RFC 5545 completo: `METHOD:REQUEST` (crear/editar) y `METHOD:CANCEL` (borrar). UID estable `{eventId}@crm-nexo` para que Google reconcilie el mismo evento. Folding de líneas largas, escape de texto según spec. |
| `src/lib/mailer.ts` | Helper SMTP reutilizando `emailSettings` de BD. `sendMail()` genérico + `sendICSEmail()` que adjunta el `.ics` con `Content-Type: text/calendar; method=REQUEST/CANCEL`. |
| `app/api/data/calendar/events/route.ts` | POST: tras crear el evento, genera `.ics`, lo envía al email del usuario (fire-and-forget) y marca `is_synced_to_google = true`. |
| `app/api/data/calendar/events/[id]/route.ts` | PUT: tras editar, envía `.ics` con `SEQUENCE` incrementado. DELETE: antes de borrar, envía `.ics` con `METHOD:CANCEL`. Ambos fire-and-forget para no bloquear la respuesta. |
| `src/views/Calendar.tsx` | Icono Google (SVG inline) en los pills de eventos con `is_synced_to_google = true`. Tooltip indica "Exportado a Google Calendar". |

**Flujo completo:**
1. Usuario crea/edita evento → API guarda en BD → genera `.ics` → envía email al usuario
2. Usuario abre email en Gmail → botón "Añadir a Google Calendar" aparece automáticamente
3. Al borrar evento → email con `METHOD:CANCEL` → Google Calendar cancela el evento

**No incluye:** OAuth, lectura de eventos de Google hacia el CRM, sincronización bidireccional.

---

### v2.1.0 — 2026-04-12

#### Infraestructura de BD (Block A)

**Nuevas tablas**

| Tabla | Propósito |
|-------|-----------|
| `flows` | Flujos de trabajo / automatizaciones n8n. Campos: `name`, `description`, `n8n_workflow_id`, `status` (active/paused/inactive), `trigger_type`, `last_run_at`, `execution_count`, `success_count` |
| `remittance_invoices` | Tabla de auditoría: registra cada factura que se añade/elimina de una remesa, con `amount` y `added_by` |
| `notifications` | Notificaciones persistentes por usuario: `user_id`, `type`, `title`, `message`, `entity_type`, `entity_id`, `is_read`, `read_at` |

**Columna añadida**
- `profiles.dashboard_config` — `JSONB` que almacena la configuración de widgets del dashboard por usuario

---

#### A1 — Remesas: auditoría de facturas
- `app/api/data/remittances/[id]/invoices/route.ts` — al añadir facturas a una remesa, se escribe una fila en `remittance_invoices` con el importe. Al eliminarlas, se borra la fila de auditoría.

#### A2 — Notificaciones persistentes
- `app/api/data/notifications/route.ts` — reescrito: genera notificaciones desde datos de negocio (contratos por vencer, facturas, presupuestos), las persiste en BD y devuelve el estado `is_read` real.
- Nuevo endpoint `PATCH /api/data/notifications` — marca una notificación o todas como leídas (`{ entityId, entityType }` o `{ all: true }`).
- `src/lib/api/notifications.ts` — helpers fetch/markRead/markAllRead.
- `NotificationCenter.tsx` — integrado con API real; el estado de lectura sobrevive recargas.

#### A3 — Módulo Flows (datos reales)
- `app/api/data/flows/route.ts` — `GET` lista + `POST` crear.
- `app/api/data/flows/[id]/route.ts` — `GET` detalle, `PUT` actualizar (incluye toggle de estado), `DELETE`.
- `src/lib/api/flows.ts` — capa fetch tipada (`FlowRow`, `FlowInsertPayload`).
- `src/hooks/useFlows.tsx` — hooks TanStack Query (`useFlows`, `useCreateFlow`, `useUpdateFlow`, `useDeleteFlow`).
- `src/views/Flows.tsx` — reescrito completamente: elimina los 4 registros hardcoded, añade diálogo de creación, búsqueda, toggle activo/pausado, borrado, stats dinámicas.

#### A4 — Dashboard config persistente
- `app/api/data/profiles/route.ts` — GET y PUT exponen `dashboard_config`; PUT acepta `{ dashboard_config: DashboardConfig }`.
- `src/hooks/useDashboardWidgets.tsx` — `useDashboardConfig` carga la config desde `profiles`, `useUpdateDashboardConfig` la persiste. Los widgets ya no se pierden al recargar.

#### D1 — Fix colores calendario
- `src/views/Calendar.tsx` — eliminadas clases Tailwind dinámicas `bg-[${hex}]/20` (incompatibles con JIT). Ahora los eventos de categoría personalizada usan `style={{ backgroundColor: hex+'33', borderColor: hex+'4d' }}`.

---

### v2.0.0 — 2026-04-12
- Migración completa Supabase → Drizzle ORM (0 imports Supabase)
- 50+ API routes con Next.js 15 App Router
- Autenticación migrada a Better Auth
- `npm run setup` — asistente interactivo de configuración con generación automática de secrets
- Dockerfile multi-stage optimizado para EasyPanel
- docker-compose.yml para desarrollo local
- TypeScript: 0 errores (`tsc --noEmit` limpio)
- package.json: versión 2.0.0

### v1.x
- Stack original con Supabase

---

## Licencia

Privado — Nexo Digital Consulting
