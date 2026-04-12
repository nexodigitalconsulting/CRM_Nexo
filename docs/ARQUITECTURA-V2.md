# ARQUITECTURA v2.0 — CRM Suite Multi-Tenant
**Versión:** 2.0.0
**Fecha:** Abril 2026
**Stack:** Next.js + PostgreSQL directo + Better Auth + Cloudflare R2 + Easypanel

---

## 0. Stack Definitivo — Confirmado

El stack v2.0 está **definitivamente decidido**. Se elimina toda dependencia de Supabase self-hosted y se adopta un stack mínimo, eficiente y fácil de replicar:

| Componente | v1 (actual) | v2 (definitivo) |
|------------|------------|----------------|
| Framework | React + Vite SPA | **Next.js 14 App Router** |
| Base de datos | PostgreSQL via Supabase self-hosted | **PostgreSQL 15** (`postgres:15-alpine`) |
| Autenticación | Supabase GoTrue (daemon separado) | **Better Auth** (open-source, in-process) |
| Acceso a datos | PostgREST + `@supabase/supabase-js` | **Drizzle ORM** (SQL type-safe directo) |
| Lógica server-side | 13 Edge Functions Deno | **Next.js API Routes** (Node.js) |
| Storage de archivos | Supabase Storage | **Cloudflare R2** (credenciales por cliente) |
| Deploy/Orquestación | Easypanel | **Easypanel** (sin cambios) |
| Integración n8n | — (Flows.tsx fake) | Via Easypanel (ya integrado) |

### Impacto en RAM por cliente

| Servicio | v1 RAM en reposo | v2 RAM en reposo |
|---------|-----------------|-----------------|
| PostgreSQL | 150–250 MB | **150–250 MB** (igual) |
| Autenticación | 80–120 MB (GoTrue) | **0 MB** (in-process en Next.js) |
| API/Queries | 50–80 MB (PostgREST) | **0 MB** (Drizzle en Next.js) |
| Edge Functions | 200–400 MB (Deno runtime) | **0 MB** (API Routes en Next.js) |
| Storage | 60–100 MB (Supabase Storage) | **0 MB** (Cloudflare R2 externo) |
| Studio | 200–350 MB | **0 MB** (eliminado) |
| Kong/Meta/Realtime | 80–150 MB | **0 MB** (eliminados) |
| Next.js (app + auth) | — | **200–350 MB** |
| **TOTAL** | **960 MB – 1.4 GB** | **350–600 MB** |
| **Ahorro** | | **~600 MB por cliente** |

**Conclusión práctica:** Un KVM 1 (4 GB) puede alojar 2–3 clientes v2. Un KVM 2 (8 GB) puede alojar 4–6 clientes.

### Por qué este stack y no otro

- **Easypanel permanece** — ya integrado con n8n y las demás herramientas del ecosistema. Cambiar el orchestrator no aporta ningún beneficio técnico a esta escala.
- **PostgreSQL directo** — elimina 7 contenedores auxiliares de Supabase (GoTrue, PostgREST, edge-runtime, Studio, Kong, meta, storage-api). Solo queda `postgres:15-alpine`.
- **Better Auth** — open source, sin vendor lock-in, soporte nativo de `organizations` (multi-tenant), sesiones en la misma BD PostgreSQL. No requiere daemon externo.
- **Drizzle ORM** — queries type-safe, ligero (~50 KB), migración transparente desde supabase-js porque el SQL subyacente es idéntico. No hay cambio de BD — solo de cliente.
- **Cloudflare R2** — 0 RAM en VPS, 10 GB/mes gratis, API S3-compatible, credenciales configurables por cliente de forma independiente.

---

## 1. Principios de Diseño

- **Zero Supabase en producción** — No hay `@supabase/supabase-js` en v2. Solo PostgreSQL puro vía Drizzle.
- **Multi-tenant desde el núcleo** — Better Auth `organizations` gestiona tenancy; `org_id` en todas las tablas de negocio.
- **Server-first** — Next.js App Router con Server Components y API Routes para toda la lógica de servidor.
- **Mínima infra por cliente** — 2 contenedores en Easypanel: `postgres:15-alpine` + Next.js. Nada más.
- **R2 por cliente** — Cada cliente configura su propio bucket R2. Aislamiento total de archivos.
- **Drizzle schema como source of truth** — El schema TypeScript en `packages/db/schema/` genera las migraciones SQL y los tipos automáticamente.
- **Variables todas runtime** — No hay Build Args que quemen valores en el bundle. Un cambio de variable solo requiere restart, no rebuild.

---

## 2. Estructura de Carpetas

```
vps-crm-suite-v2/
├── apps/
│   └── web/                          # Aplicación Next.js principal
│       ├── app/
│       │   ├── (auth)/               # Rutas públicas
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   └── layout.tsx
│       │   ├── (dashboard)/          # Rutas protegidas por tenant
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          # Dashboard
│       │   │   ├── clients/
│       │   │   ├── contacts/
│       │   │   ├── services/
│       │   │   ├── quotes/
│       │   │   ├── contracts/
│       │   │   ├── invoices/
│       │   │   ├── remittances/
│       │   │   ├── expenses/
│       │   │   ├── campaigns/
│       │   │   ├── calendar/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   ├── api/                  # API Routes (reemplazan Edge Functions Deno)
│       │   │   ├── auth/
│       │   │   │   └── [...all]/route.ts     # Better Auth handler (catch-all)
│       │   │   ├── email/
│       │   │   │   └── send/route.ts         # ← ex send-email Edge Function
│       │   │   ├── calendar/
│       │   │   │   ├── auth/route.ts         # ← ex google-calendar-auth
│       │   │   │   ├── callback/route.ts     # ← ex google-calendar-callback
│       │   │   │   ├── events/route.ts       # ← ex google-calendar-events
│       │   │   │   └── ical/route.ts         # ← ex calendar-ical
│       │   │   ├── gmail/
│       │   │   │   ├── auth/route.ts         # ← ex gmail-oauth-auth
│       │   │   │   └── callback/route.ts     # ← ex gmail-oauth-callback
│       │   │   ├── notifications/
│       │   │   │   └── process/route.ts      # ← ex process-notifications
│       │   │   ├── admin/
│       │   │   │   └── bootstrap/route.ts    # ← ex bootstrap-admin
│       │   │   ├── pdf/
│       │   │   │   └── generate/route.ts     # PDF server-side (quita pdf-lib del browser)
│       │   │   ├── export/
│       │   │   │   └── [type]/route.ts
│       │   │   ├── health/route.ts            # ← ex ping Edge Function
│       │   │   └── webhooks/
│       │   │       └── n8n/route.ts
│       │   ├── setup/                # Wizard primer uso del tenant
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                   # shadcn/ui (sin cambios)
│       │   ├── layout/
│       │   │   ├── AppSidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   ├── TenantSwitcher.tsx
│       │   │   └── MainLayout.tsx
│       │   └── common/
│       │       ├── DataTable.tsx
│       │       ├── FilterBar.tsx
│       │       └── ExportButton.tsx
│       ├── lib/
│       │   ├── auth/
│       │   │   ├── server.ts         # Better Auth — instancia del servidor
│       │   │   ├── client.ts         # Better Auth — cliente browser
│       │   │   └── middleware.ts     # Auth middleware helpers
│       │   ├── db/
│       │   │   ├── client.ts         # Drizzle client singleton (Pool pg)
│       │   │   └── queries/          # Query functions por módulo
│       │   │       ├── clients.ts
│       │   │       ├── invoices.ts
│       │   │       ├── contracts.ts
│       │   │       ├── quotes.ts
│       │   │       ├── remittances.ts
│       │   │       ├── expenses.ts
│       │   │       ├── campaigns.ts
│       │   │       ├── services.ts
│       │   │       ├── calendar.ts
│       │   │       └── settings.ts
│       │   ├── r2/
│       │   │   └── client.ts         # Cloudflare R2 — S3-compatible client
│       │   ├── email/
│       │   │   └── sender.ts         # Nodemailer wrapper (reemplaza Deno SMTP)
│       │   ├── pdf/
│       │   │   └── generator.ts      # pdf-lib server-side (quita ~800 KB del bundle)
│       │   ├── sepa/
│       │   │   └── sepaXmlGenerator.ts  # Sin cambios (lógica pura TS)
│       │   └── utils.ts
│       ├── hooks/                    # Solo hooks UI y estado local
│       │   ├── use-mobile.ts
│       │   ├── use-table-state.ts
│       │   └── use-toast.ts
│       ├── middleware.ts             # Better Auth + tenant resolution
│       └── next.config.ts
├── packages/
│   ├── db/                           # Schema Drizzle + migraciones generadas
│   │   ├── schema/
│   │   │   ├── index.ts              # Re-export de todos los schemas
│   │   │   ├── auth.ts               # Tablas de Better Auth (generadas)
│   │   │   ├── organizations.ts      # Tenants
│   │   │   ├── clients.ts
│   │   │   ├── contacts.ts
│   │   │   ├── invoices.ts
│   │   │   ├── contracts.ts
│   │   │   ├── quotes.ts
│   │   │   ├── remittances.ts
│   │   │   ├── expenses.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── services.ts
│   │   │   ├── calendar.ts
│   │   │   └── settings.ts
│   │   ├── migrations/               # SQL generados por `drizzle-kit generate`
│   │   │   ├── 0001_initial_schema.sql
│   │   │   ├── 0002_add_org_id.sql
│   │   │   └── meta/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── ui/                           # Design system (shadcn base + tokens)
├── easypanel/
│   ├── scripts/
│   │   ├── startup.sh                # Simplificado: migrate + next start
│   │   └── new-client.sh             # Script provisioning nuevo cliente
│   └── init-scripts/
│       └── full-schema.sql           # Schema SQL legacy v1 (referencia)
├── docker/
│   ├── Dockerfile                    # Multi-stage: node builder + node runner
│   └── docker-compose.dev.yml        # Desarrollo local: PG + app
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
└── docs/
```

**Archivos eliminados respecto a v1:**
- `supabase/functions/` — reemplazado por `app/api/`
- `supabase/config.toml` — ya no aplica
- `src/integrations/supabase/` — reemplazado por `lib/db/` y `lib/auth/`
- `src/components/MigrationGate.tsx` — ya no necesario
- `src/lib/schemaChecker.ts` — Drizzle gestiona migraciones

---

## 3. Autenticación — Better Auth

Better Auth reemplaza Supabase GoTrue. Soporte nativo de `organizations` para multi-tenant. Sesiones en la misma BD PostgreSQL (sin daemon separado).

### 3.1 Instancia del servidor

```typescript
// lib/auth/server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/lib/db/client";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // Ajustar según necesidades
  },
  plugins: [
    organization({
      // Roles del CRM: owner > admin > manager > user > readonly
      membershipRoles: ["owner", "admin", "manager", "user", "readonly"],
      allowUserToCreateOrganization: false,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 días
    updateAge: 60 * 60 * 24,        // Renovar si < 1 día de vida
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
});
```

### 3.2 API Route handler (catch-all)

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
// Maneja: /api/auth/sign-in, /api/auth/sign-out, /api/auth/session, etc.
```

### 3.3 Cliente browser

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [organizationClient()],
});

// Uso en componentes cliente (reemplaza supabase.auth.getUser()):
// const { data: session } = authClient.useSession();
// authClient.signIn.email({ email, password });
// authClient.signOut();
```

### 3.4 Middleware de autenticación y tenant

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isPublicApi = request.nextUrl.pathname.startsWith("/api/health");

  if (isPublicApi) return NextResponse.next();

  if (isAuthRoute) {
    if (session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Inyectar org_id activo para uso en Server Components y API Routes
  const orgId = session.session.activeOrganizationId;
  const requestHeaders = new Headers(request.headers);
  if (orgId) requestHeaders.set("x-org-id", orgId);
  requestHeaders.set("x-user-id", session.user.id);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 3.5 Tablas creadas automáticamente por Better Auth

Better Auth con el adaptador Drizzle crea estas tablas en el primer arranque:

```
user            — usuarios (equivale a auth.users de Supabase)
session         — sesiones activas (en PostgreSQL, no Redis)
account         — cuentas OAuth vinculadas
verification    — tokens de verificación de email / reset password
organization    — tenants (equivale a tabla organizations del CRM)
member          — pertenencia usuario ↔ organización con rol
invitation      — invitaciones por email pendientes
```

No es necesario crear estas tablas manualmente. Better Auth las genera con `drizzle-kit push` o al arrancar con `migrate: true`.

---

## 4. Base de Datos — Drizzle ORM

Drizzle reemplaza el cliente de Supabase (`supabase.from('tabla')`). Las queries son type-safe y se ejecutan directamente contra PostgreSQL.

### 4.1 Cliente Drizzle

```typescript
// lib/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@packages/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

### 4.2 Schema de ejemplo con org_id

```typescript
// packages/db/schema/clients.ts
import { pgTable, uuid, text, pgEnum, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const clientStatusEnum = pgEnum("client_status", [
  "activo", "inactivo", "prospecto", "archivado"
]);

export const clients = pgTable("clients", {
  id:         uuid("id").primaryKey().defaultRandom(),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  email:      text("email"),
  phone:      text("phone"),
  taxId:      text("tax_id"),
  status:     clientStatusEnum("status").default("activo").notNull(),
  notes:      text("notes"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdIdx:   index("clients_org_id_idx").on(table.orgId),
  statusIdx:  index("clients_status_idx").on(table.orgId, table.status),
}));
```

### 4.3 Queries equivalentes a supabase-js

```typescript
// lib/db/queries/clients.ts
import { db } from "@/lib/db/client";
import { clients } from "@packages/db/schema";
import { eq, ilike, and, desc, count } from "drizzle-orm";

// Helper para obtener org_id del request (inyectado por middleware)
function getOrgId(): string {
  const { headers } = require("next/headers");
  const orgId = headers().get("x-org-id");
  if (!orgId) throw new Error("No active organization in session");
  return orgId;
}

export const clientsDb = {

  // Equivalente: supabase.from('clients').select('*', {count:'exact'}).order('created_at',{ascending:false}).range(from, to)
  list: async ({ page = 1, pageSize = 25, search }: ListParams) => {
    const orgId = getOrgId();
    const offset = (page - 1) * pageSize;
    const conditions = search
      ? and(eq(clients.orgId, orgId), ilike(clients.name, `%${search}%`))
      : eq(clients.orgId, orgId);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(clients).where(conditions)
        .orderBy(desc(clients.createdAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(clients).where(conditions),
    ]);
    return { data: rows, totalCount: total };
  },

  // Equivalente: supabase.from('clients').insert(input).select().single()
  create: async (input: Omit<typeof clients.$inferInsert, "id" | "orgId" | "createdAt" | "updatedAt">) => {
    const orgId = getOrgId();
    const [created] = await db.insert(clients).values({ ...input, orgId }).returning();
    return created;
  },

  // Equivalente: supabase.from('clients').update(input).eq('id', id)
  update: async (id: string, input: Partial<typeof clients.$inferInsert>) => {
    const orgId = getOrgId();
    const [updated] = await db.update(clients)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
      .returning();
    return updated;
  },

  // Equivalente: supabase.from('clients').delete().eq('id', id)
  delete: async (id: string) => {
    const orgId = getOrgId();
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.orgId, orgId)));
  },

  getById: async (id: string) => {
    const orgId = getOrgId();
    const [client] = await db.select().from(clients)
      .where(and(eq(clients.id, id), eq(clients.orgId, orgId)));
    return client ?? null;
  },
};
```

> **Nota sobre seguridad multi-tenant:** En v1 la seguridad la gestionaba PostgreSQL RLS con `auth.uid()` vía PostgREST. En v2, el `org_id` se inyecta en **todas las queries desde el servidor Next.js**. No hay acceso directo del browser a la BD — toda la capa de datos pasa por Server Components o API Routes autenticadas.

### 4.4 Migraciones con Drizzle Kit

```bash
# Generar migration SQL a partir de cambios en el schema
npx drizzle-kit generate

# Aplicar migraciones en producción
npx drizzle-kit migrate

# O en startup.sh del contenedor:
node -e "require('./scripts/migrate').migrate()"
```

---

## 5. Almacenamiento — Cloudflare R2

R2 reemplaza Supabase Storage. Compatible con la API S3, 10 GB/mes gratis por bucket, 0 RAM en el VPS.

### 5.1 Cliente R2

```typescript
// lib/r2/client.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME!;

// Subir archivo — reemplaza: supabase.storage.from('bucket').upload(path, file)
export async function uploadFile(key: string, body: Buffer | Blob, contentType: string) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  // Si el bucket tiene acceso público:
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// URL firmada para archivos privados — reemplaza: supabase.storage.from('bucket').createSignedUrl(path, 3600)
export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const client = getR2Client();
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

// Eliminar — reemplaza: supabase.storage.from('bucket').remove([path])
export async function deleteFile(key: string) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
```

### 5.2 Variables R2 (por cliente en Easypanel)

```env
R2_ACCOUNT_ID=abc123def456789
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=crm-empresa-abc
R2_PUBLIC_URL=https://pub-abc123.r2.dev     # Si el bucket tiene acceso público habilitado
```

> Cada cliente puede tener su cuenta Cloudflare gratuita con un bucket dedicado, o usar una cuenta compartida con buckets separados (key prefix por `org_id`). Ambas opciones tienen 0 impacto de RAM en el VPS.

---

## 6. API Routes — Migración de Edge Functions Deno

Las 13 Edge Functions Deno se migran a API Routes de Next.js. La lógica de negocio es equivalente pero en Node.js con Drizzle en lugar de Supabase client.

| Edge Function (eliminada) | API Route (nueva) | Esfuerzo | Notas |
|--------------------------|-------------------|---------|-------|
| `main/index.ts` (dispatcher) | — | Eliminar | Innecesario en Next.js |
| `ping/index.ts` | `api/health/route.ts` | 1h | Trivial |
| `send-email/index.ts` | `api/email/send/route.ts` | 4h | Nodemailer en lugar de Deno SMTP |
| `db-migrate/index.ts` | — | Eliminar | Drizzle gestiona migraciones |
| `setup-database/index.ts` | — | Eliminar | Drizzle gestiona schema |
| `bootstrap-admin/index.ts` | `api/admin/bootstrap/route.ts` | 3h | Better Auth admin API |
| `process-notifications/index.ts` | `api/notifications/process/route.ts` | 4h | Drizzle queries |
| `google-calendar-auth/index.ts` | `api/calendar/auth/route.ts` | 3h | Mismo OAuth flow |
| `google-calendar-callback/index.ts` | `api/calendar/callback/route.ts` | 3h | Mismo OAuth flow |
| `google-calendar-events/index.ts` | `api/calendar/events/route.ts` | 3h | Misma API Google |
| `gmail-oauth-auth/index.ts` | `api/gmail/auth/route.ts` | 2h | Mismo OAuth flow |
| `gmail-oauth-callback/index.ts` | `api/gmail/callback/route.ts` | 2h | Mismo OAuth flow |
| `calendar-ical/index.ts` | `api/calendar/ical/route.ts` | 3h | Misma lógica iCal |
| **Total** | | **~28h (~3.5 días)** | |

### Ejemplo: migración de send-email

```typescript
// app/api/email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { emailSettings } from "@packages/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, html } = await request.json();
  const orgId = request.headers.get("x-org-id")!;

  // Obtener config SMTP del tenant (igual que en la Edge Function, pero con Drizzle)
  const [config] = await db.select().from(emailSettings).where(eq(emailSettings.orgId, orgId));
  if (!config) return NextResponse.json({ error: "SMTP not configured" }, { status: 400 });

  const transporter = nodemailer.createTransporter({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  });

  await transporter.sendMail({ from: `"${config.fromName}" <${config.fromEmail}>`, to, subject, html });
  return NextResponse.json({ ok: true });
}
```

---

## 7. Sistema Multi-Tenant

### 7.1 Modelo de tenancy

Better Auth `organizations` gestiona el multi-tenant de forma nativa:

```typescript
// Crear organización para un nuevo cliente (en el script de provisioning)
const { organization } = await auth.api.createOrganization({
  name: "Empresa ABC S.L.",
  slug: "empresa-abc",
  userId: adminUserId,  // El usuario que la crea se convierte en "owner"
});

// Invitar usuario a la organización
await auth.api.inviteMember({
  organizationId: organization.id,
  email: "usuario@empresa.com",
  role: "member",
});

// Obtener org activa en sesión (en Server Components)
const session = await auth.api.getSession({ headers });
const activeOrgId = session?.session.activeOrganizationId;
```

### 7.2 org_id en todas las tablas de negocio

Todas las tablas de negocio tienen `org_id` como columna obligatoria con FK a `organization.id`:

```sql
-- Tablas que requieren columna org_id (migración v1→v2):
ALTER TABLE clients           ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE contacts          ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE services          ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE campaigns         ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE quotes             ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE contracts         ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE invoices          ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE invoice_items      ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE remittances        ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE expenses           ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE calendar_events    ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE email_settings     ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE company_settings   ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE pdf_templates      ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE dashboard_widgets  ADD COLUMN org_id UUID REFERENCES organization(id);
ALTER TABLE notification_queue ADD COLUMN org_id UUID REFERENCES organization(id);
```

### 7.3 Aislamiento de datos (sin RLS)

En v2 el aislamiento es a nivel de aplicación — todas las queries incluyen `WHERE org_id = ?`:

```typescript
// Este patrón es OBLIGATORIO en cada query de Drizzle:
const orgId = headers().get("x-org-id")!;  // Inyectado por middleware
await db.select().from(clients).where(eq(clients.orgId, orgId));

// No hay acceso directo del browser a PostgreSQL — todo pasa por Next.js server
```

> Si en el futuro se quiere añadir RLS de PostgreSQL como capa extra de seguridad, es compatible con Drizzle. Pero no es necesario en v2 porque no hay PostgREST con acceso browser directo.

---

## 8. Variables de Entorno — Mapa Completo

### .env.example (stack v2 definitivo)

```env
# ============================================
# CRM Suite v2 — Variables de Entorno
# ============================================

# === BASE DE DATOS ===
DATABASE_URL=postgresql://postgres:PASSWORD@PROYECTO_postgres-1:5432/crm
# En desarrollo local: postgresql://postgres:PASSWORD@localhost:5432/crm

# === BETTER AUTH ===
BETTER_AUTH_SECRET=secreto_aleatorio_minimo_32_caracteres   # openssl rand -base64 32
BETTER_AUTH_URL=https://crm.empresa-cliente.com

# === CLOUDFLARE R2 ===
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=crm-empresa-abc
R2_PUBLIC_URL=                        # URL pública del bucket (opcional)

# === GOOGLE CALENDAR / GMAIL OAUTH ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# === APP ===
NEXT_PUBLIC_APP_URL=https://crm.empresa-cliente.com
NODE_ENV=production
```

**Variables eliminadas respecto a v1:**

| Variable v1 | Motivo eliminación |
|-------------|-------------------|
| `VITE_SUPABASE_URL` | No hay Supabase |
| `VITE_SUPABASE_ANON_KEY` | No hay Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | No hay Supabase |
| `EXTERNAL_POSTGRES_HOST/PORT/DB/USER/PASSWORD` | Reemplazado por `DATABASE_URL` |
| `EDGE_FUNCTIONS_VOLUME` | No hay Edge Functions |
| `EDGE_RUNTIME_CONTAINER` | No hay edge-runtime |
| `SUPABASE_FUNCTIONS_VOLUME` | No hay Edge Functions |
| `SUPABASE_URL` | No hay Supabase |

---

## 9. Deploy con Easypanel — Stack Simplificado

En v2, cada cliente necesita solo **2 servicios** en Easypanel (vs 8–10 en v1 con Supabase).

### 9.1 Servicio 1: PostgreSQL

1. Easypanel → proyecto `PROYECTO` → **+ Service → From Template → PostgreSQL**
2. Imagen: `postgres:15-alpine`
3. Configurar:
   - `POSTGRES_DB=crm`
   - `POSTGRES_USER=postgres`
   - `POSTGRES_PASSWORD=[generar segura]`
4. Sin mounts especiales necesarios (Easypanel gestiona el volumen de datos)

### 9.2 Servicio 2: CRM (Next.js)

1. Easypanel → mismo proyecto → **+ Service → App → GitHub**
2. Repositorio: `nexodigitalconsulting/vps-crm-suite`, branch `main`
3. Dockerfile detectado automáticamente
4. Variables de entorno (**todas en Environment Variables, ninguna como Build Arg**):
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@PROYECTO_postgres-1:5432/crm
   BETTER_AUTH_SECRET=[openssl rand -base64 32]
   BETTER_AUTH_URL=https://crm.cliente.com
   NEXT_PUBLIC_APP_URL=https://crm.cliente.com
   R2_ACCOUNT_ID=[del panel Cloudflare]
   R2_ACCESS_KEY_ID=[del panel Cloudflare]
   R2_SECRET_ACCESS_KEY=[del panel Cloudflare]
   R2_BUCKET_NAME=crm-[proyecto]
   GOOGLE_CLIENT_ID=[del panel Google Cloud]
   GOOGLE_CLIENT_SECRET=[del panel Google Cloud]
   ```
5. Dominio: `crm.cliente.com`, puerto: `3000`
6. **Sin mounts necesarios** — no hay Edge Functions que sincronizar, no hay volúmenes de funciones

> **Cambio crítico:** En v2 no hay Build Arguments que quemen URLs en el bundle. Todas las variables son runtime (`process.env.VAR`). Un cambio de `DATABASE_URL` o `BETTER_AUTH_SECRET` solo requiere **restart**, no rebuild.

### 9.3 Dockerfile v2

```dockerfile
# Stage 1: Instalar dependencias y compilar
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # next build --standalone (output: .next/standalone)

# Stage 2: Runtime mínimo (sin herramientas de build)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone output — incluye todo lo necesario
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/packages/db/migrations ./drizzle

# Script startup simplificado
COPY easypanel/scripts/startup.sh /startup.sh
RUN chmod +x /startup.sh

EXPOSE 3000
ENV PORT=3000
CMD ["/startup.sh"]
```

### 9.4 startup.sh v2 (simplificado)

```bash
#!/bin/bash
# startup.sh v2 — sin Supabase, sin Edge Functions sync

echo "=== CRM Suite v2 — Startup ==="

# 1. Verificar conexión a PostgreSQL
echo "Verificando PostgreSQL..."
until pg_isready -d "$DATABASE_URL" 2>/dev/null; do
  echo "Esperando PostgreSQL... ($i)"
  sleep 2
done
echo "✅ PostgreSQL conectado"

# 2. Aplicar migraciones Drizzle
echo "Aplicando migraciones..."
node scripts/migrate.js
echo "✅ Migraciones aplicadas"

# 3. Iniciar Next.js (standalone output)
echo "Iniciando Next.js en puerto $PORT..."
exec node server.js
```

**Comparación con startup.sh v1:** eliminados los pasos de:
- Verificar schema_versions (ahora lo gestiona Drizzle)
- Ejecutar post-deploy.sh / apply_all.sql
- Ejecutar sync-edge-functions.sh
- Listar funciones edge
- Verificar version.json

---

## 10. Plan de Migración desde v1

### 10.1 Lo que NO cambia en el código

- Todos los componentes de UI (`src/components/`) salvo `MigrationGate.tsx` (se elimina)
- La lógica SEPA XML (`src/lib/sepa/sepaXmlGenerator.ts`) — cero cambios
- Los formularios con React Hook Form + Zod
- El schema de base de datos (tablas, columnas, tipos) — solo se añade `org_id`
- El sistema de roles (`admin`, `manager`, `user`, `readonly`)
- shadcn/ui components

### 10.2 Mapa de cambios por capa

| Capa | Archivo(s) v1 | Equivalente v2 | Esfuerzo |
|------|--------------|---------------|---------|
| Cliente de BD | `src/integrations/supabase/client.ts` | `lib/db/client.ts` (Drizzle) | 1 día setup |
| Queries de datos | 25+ hooks `src/hooks/use*.ts` | `lib/db/queries/*.ts` + hooks adaptados | 4 días |
| Auth | `src/hooks/useAuth.tsx` | `authClient.useSession()` (Better Auth) | 1 día |
| Auth middleware | No existe en v1 | `middleware.ts` (Better Auth) | 0.5 días |
| Storage | Via Edge Functions | `lib/r2/client.ts` | 1 día |
| Edge Functions | `supabase/functions/*/index.ts` (13) | `app/api/*/route.ts` (11) | 3.5 días |
| Startup container | `nginx + bash + Edge Functions sync` | `node server.js + drizzle migrate` | 1 día |
| Env vars | Variables Supabase/Vite | Variables PostgreSQL/BetterAuth/R2 | 0.5 días |
| **Total** | | | **~12 días** |

### 10.3 Migración de datos v1 → v2 (single-tenant → multi-tenant)

Para cada cliente v1 existente, ejecutar este script de migración:

```sql
-- 1. La tabla organization ya existe (la crea Better Auth)
-- Insertar la organización del cliente existente
INSERT INTO organization (id, name, slug, created_at, updated_at)
VALUES (gen_random_uuid(), 'Nombre Empresa', 'nombre-empresa', now(), now())
RETURNING id;

-- 2. Asignar todos los datos existentes a esa organización
-- (ejecutar para cada tabla que tenga columna org_id añadida)
UPDATE clients           SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE contacts          SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE invoices          SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE contracts         SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE quotes            SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE expenses          SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
UPDATE remittances       SET org_id = '[ORG_ID_RECIÉN_CREADO]' WHERE org_id IS NULL;
-- ... resto de tablas

-- 3. Hacer NOT NULL después de rellenar
ALTER TABLE clients  ALTER COLUMN org_id SET NOT NULL;
-- etc.
```

---

## 11. Seguridad v2

| Aspecto | v1 | v2 |
|---------|----|----|
| Credenciales en repo | `.env` en repo, fallback hardcodeado | Solo `.env.example`, variables en Easypanel |
| Acceso BD desde browser | Sí (via PostgREST con anon key) | No — solo desde servidor Next.js |
| Auth | GoTrue (daemon externo) | Better Auth (in-process, sin superficie de ataque extra) |
| Aislamiento multi-tenant | RLS via PostgreSQL | org_id en queries server-side |
| Variables en bundle JS | Sí (`VITE_*` quemadas en JS) | No (`NEXT_PUBLIC_*` solo para URL pública) |
| Edge Functions CORS | `*` (wildcard) | API Routes protegidas por sesión |

---

## 12. Diagramas de Arquitectura

### v1 (actual) — Containers por cliente en KVM 2 (8 GB)

```
VPS KVM 2 (8 GB RAM)
│
├── CRM Web (Nginx + bash)      ~20 MB
├── supabase-db (PostgreSQL)    ~200 MB
├── supabase-auth (GoTrue)      ~100 MB
├── supabase-rest (PostgREST)   ~60 MB
├── supabase-functions (Deno)   ~300 MB
├── supabase-realtime           ~150 MB
├── supabase-storage            ~80 MB
├── supabase-studio             ~250 MB
├── supabase-kong               ~100 MB
└── supabase-meta               ~50 MB
                       Total: ~1.3 GB en reposo
```

### v2 (definitivo) — Containers por cliente en KVM 1 (4 GB)

```
VPS KVM 1 (4 GB RAM) — caben 2-3 clientes v2
│
├── PostgreSQL 15 (postgres:15-alpine)    ~200 MB
└── CRM Next.js (node:20-alpine)          ~300 MB
                                Total: ~500 MB

Browser ──HTTPS──► Next.js:3000
                      ├── Server Components (páginas con datos)
                      ├── API Routes
                      │     ├── /api/auth/* (Better Auth — in-process)
                      │     ├── /api/email/send
                      │     ├── /api/calendar/*
                      │     └── /api/health
                      └── Drizzle ORM (queries directas)
                              │
                   ┌──────────┴──────────────────┐
                   ▼                              ▼
          PostgreSQL:5432                 Cloudflare R2
          (Better Auth tables             (logos, adjuntos,
           + tablas de negocio)            facturas PDF)
                                          0 RAM en VPS
                                          10 GB/mes gratis
```

### v2 multi-tenant (10+ clientes en 1 VPS)

```
VPS KVM 4 (16 GB) — todos los clientes en un solo servidor
│
├── PostgreSQL 15 (1 instancia, N orgs)   ~400-600 MB
└── CRM Next.js                           ~400-600 MB
                                Total: ~800 MB - 1.2 GB
                                Margen: 14+ GB libres

Browser (tenant A) → Next.js → WHERE org_id = A → PostgreSQL
Browser (tenant B) → Next.js → WHERE org_id = B → PostgreSQL
                Better Auth valida sesión y org_id activo
                Drizzle garantiza filtro org_id en cada query
```
