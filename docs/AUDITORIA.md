# AUDITORÍA TÉCNICA — CRM Suite v1.x
**Fecha:** Abril 2026
**Repo auditado:** `nexodigitalconsulting/vps-crm-suite`
**Auditor:** Claude Sonnet 4.6 / Nexo Digital Consulting

---

## 1. Estructura Técnica Actual

```
vps-crm-suite/
├── src/
│   ├── App.tsx                        # Router principal + providers
│   ├── pages/                         # 17 páginas (una por módulo)
│   ├── components/
│   │   ├── ui/                        # ~40 componentes shadcn/ui
│   │   ├── layout/                    # AppSidebar, Header, MainLayout
│   │   ├── settings/                  # 15 componentes de configuración
│   │   ├── dashboard/                 # 7 widgets de dashboard
│   │   └── [módulo]/                  # FormDialog por cada módulo
│   ├── hooks/                         # ~25 hooks de datos (uno por entidad)
│   ├── lib/
│   │   ├── pdf/                       # Generación PDF (contract, invoice, quote)
│   │   ├── sepa/                      # Generador XML SEPA ISO 20022
│   │   └── exportUtils.ts             # Export CSV/Excel
│   └── integrations/supabase/
│       ├── client.ts                  # Singleton Supabase client
│       └── types.ts                   # Tipos generados automáticamente
├── supabase/
│   ├── functions/                     # 12 Edge Functions (Deno)
│   └── migrations/                    # 27 migraciones (dic 2025 - ene 2026)
├── easypanel/
│   ├── init-scripts/                  # Schema SQL + migraciones manuales
│   └── scripts/                       # startup.sh, deploy, verify
├── Dockerfile                         # Multi-stage: Node builder + Nginx
├── nixpacks.toml                      # Alternativa a Dockerfile
└── vite.config.ts                     # Vite + SWC + lovable-tagger
```

### Páginas y módulos activos

| Ruta | Módulo | Estado |
|------|--------|--------|
| `/` | Dashboard dinámico con widgets | Activo |
| `/campaigns` | Campañas de marketing | Activo |
| `/contacts` | Gestión de contactos | Activo |
| `/clients` | Gestión de clientes | Activo |
| `/services` | Catálogo de servicios | Activo |
| `/quotes` | Presupuestos | Activo |
| `/contracts` | Contratos | Activo |
| `/invoices` | Facturas | Activo |
| `/remittances` | Remesas SEPA | Activo |
| `/expenses` | Control de gastos | Activo |
| `/product-analysis` | Análisis de productos | Activo |
| `/flows` | Flujos n8n embebido | Activo |
| `/calendar` | Calendario (Google Sync) | Activo |
| `/settings` | Configuración (solo admin) | Activo |
| `/profile` | Perfil de usuario | Activo |
| `/auth` | Login / Registro | Activo |
| `/setup` | Asistente inicial | Activo |

---

## 1b. Infraestructura y Deploy Real

> Esta sección documenta el sistema de deploy real usado en producción con clientes en Hostinger/Easypanel. Reemplaza cualquier asunción previa sobre el proceso de despliegue.

### Visión general del sistema

```
GitHub repo (nexodigitalconsulting/vps-crm-suite)
        │
        │  git push → Easypanel hace pull + docker build
        ▼
┌───────────────────────────────────────────────────────┐
│              VPS Hostinger (por cliente)              │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │  Contenedor: crm-web (Nginx:alpine, p.3000)  │    │
│  │  • Sirve el bundle JS/HTML estático          │    │
│  │  • postgresql-client (para migraciones)      │    │
│  │  • docker-cli (para sincronizar functions)   │    │
│  │  • startup.sh → migraciones → sync → nginx   │    │
│  └─────────────────────┬────────────────────────┘    │
│                        │ VITE_SUPABASE_URL            │
│  ┌─────────────────────▼────────────────────────┐    │
│  │  Supabase Self-Hosted (stack Docker)         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │    │
│  │  │PostgREST │  │edge-funcs│  │  GoTrue   │  │    │
│  │  │ :8000    │  │ (Deno)   │  │  (Auth)   │  │    │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │    │
│  │       └─────────────┴──────────────┘         │    │
│  │                      │                        │    │
│  │         ┌────────────▼──────────────┐         │    │
│  │         │  PostgreSQL 15 (p.5432)   │         │    │
│  │         └───────────────────────────┘         │    │
│  └──────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

### Dockerfile — Análisis detallado

El Dockerfile usa **multi-stage build** con dos stages:

#### Stage 1: Builder (`node:20-alpine`)

```dockerfile
FROM docker.io/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .

# Variables quemadas en el bundle JS en tiempo de build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN npm run build   # → genera dist/
```

**Implicaciones críticas:**
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se pasan como **Build Arguments** de Easypanel, NO como variables de entorno runtime.
- Quedan **quemadas en el bundle JS** compilado. Si cambian, hay que hacer **Rebuild** completo, un simple restart NO es suficiente.
- Easypanel las llama "Build Arguments" (distintas de "Environment Variables").

#### Stage 2: Producción (`nginx:alpine`)

```dockerfile
FROM docker.io/library/nginx:alpine

# Herramientas adicionales para infraestructura
RUN apk add --no-cache postgresql-client bash curl docker-cli

# App estática compilada
COPY --from=builder /app/dist /usr/share/nginx/html

# Scripts de infraestructura
COPY --from=builder /app/easypanel/scripts /app/easypanel/scripts
COPY --from=builder /app/easypanel/init-scripts /app/easypanel/init-scripts

# Edge Functions (fuente para copiar al contenedor Supabase)
COPY --from=builder /app/supabase/functions /app/supabase/functions

EXPOSE 3000
CMD ["/app/easypanel/scripts/startup.sh"]
```

**Por qué `docker-cli` en Nginx:**
El contenedor CRM actúa como "orquestador" que, al arrancar, puede hablar con el demonio Docker del host para copiar las Edge Functions al contenedor Supabase y reiniciarlo. Esto requiere montar `/var/run/docker.sock`.

#### Configuración Nginx interna

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché de activos estáticos 1 año
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        return 200 "OK";
    }
}
```

**Nota:** El puerto interno es **3000**, no 80. Easypanel lo mapea al dominio del cliente vía proxy reverso HTTPS.

#### Alternativa `nixpacks.toml`

Existe también `nixpacks.toml` para deploy sin Docker (compatible con Railway, Render, etc.):
```toml
providers = ["node"]
[phases.setup]
nixPkgs = ["nodejs_20", "npm-9_x"]
[phases.install]
cmds = ["npm install --no-audit --no-fund"]
[phases.build]
cmds = ["npm run build"]
[start]
cmd = "npm run start"   # vite preview --host 0.0.0.0 --port 4173
```
En este modo NO hay migraciones automáticas ni sincronización de Edge Functions.

---

### Variables de entorno — Mapa completo

El contenedor CRM necesita **dos tipos** de variables, configuradas en lugares distintos de Easypanel:

#### Build Arguments (en tiempo de build — quemadas en JS)
| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `VITE_SUPABASE_URL` | SÍ | URL pública de Supabase self-hosted (ej: `https://supabase.cliente.com`) |
| `VITE_SUPABASE_ANON_KEY` | SÍ | Clave anon pública de Supabase |

> Cambiar estas variables requiere **Rebuild** en Easypanel.

#### Environment Variables (runtime — para scripts bash)
| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `EXTERNAL_POSTGRES_HOST` | Para migraciones | Host de PostgreSQL de Supabase self-hosted |
| `EXTERNAL_POSTGRES_PORT` | No (default: 5432) | Puerto PostgreSQL |
| `EXTERNAL_POSTGRES_DB` | No (default: postgres) | Nombre de la base de datos |
| `EXTERNAL_POSTGRES_USER` | No (default: postgres) | Usuario PostgreSQL |
| `EXTERNAL_POSTGRES_PASSWORD` | Para migraciones | Contraseña PostgreSQL |
| `EDGE_FUNCTIONS_VOLUME` | Para sync automático | Ruta al volumen de funciones en el host |
| `EDGE_RUNTIME_CONTAINER` | Para Docker socket | Nombre del contenedor edge-runtime |
| `SUPABASE_FUNCTIONS_VOLUME` | Para `post-deploy.sh` | Ruta al volumen (alternativa a `EDGE_FUNCTIONS_VOLUME`) |
| `SUPABASE_URL` | Para verificación | URL de Supabase (para health checks) |

---

### Ciclo de vida del contenedor — startup.sh

Al arrancar, el contenedor ejecuta `/app/easypanel/scripts/startup.sh` en este orden:

```
PASO 1: Verificar PostgreSQL
  ├─ Conecta con psql usando EXTERNAL_POSTGRES_*
  ├─ Lee schema_versions para conocer versión actual
  └─ Compara con CODE_SCHEMA_VERSION="v1.4.0"

PASO 2: Migraciones SQL → llama a post-deploy.sh
  ├─ Conecta a PostgreSQL
  ├─ Verifica tabla schema_versions
  ├─ Ejecuta apply_all.sql si hay pendientes
  └─ Registra versión aplicada

PASO 3: Sincronizar Edge Functions → llama a sync-edge-functions.sh
  ├─ MÉTODO 1 (preferido): EDGE_FUNCTIONS_VOLUME
  │   └─ cp /app/supabase/functions/* → $EDGE_FUNCTIONS_VOLUME/
  └─ MÉTODO 2 (fallback): Docker Socket
      ├─ Detecta contenedor edge-runtime
      ├─ docker cp functions → contenedor
      └─ docker restart $EDGE_CONTAINER

PASO 4: Listar funciones y verificar version.json

PASO 5: exec nginx -g "daemon off;"
```

**Nota sobre versión hardcodeada:** `startup.sh` tiene `CODE_SCHEMA_VERSION="v1.4.0"` pero `post-deploy.sh` tiene `TARGET_VERSION="v1.3.0"` y `db-migrate/index.ts` usa `CURRENT_VERSION = "v1.9.0"`. Hay **inconsistencia de versiones** entre los tres archivos — deuda técnica a resolver en v2.

---

### Supabase Self-Hosted — Configuración real

El stack de Supabase self-hosted en Hostinger incluye estos contenedores (nombres típicos en Easypanel):

```
proyecto_supabase-db-1          → PostgreSQL 15
proyecto_supabase-rest-1        → PostgREST (API REST sobre PostgreSQL)
proyecto_supabase-auth-1        → GoTrue (autenticación)
proyecto_supabase-storage-1     → Storage (archivos)
proyecto_supabase-functions-1   → Deno edge-runtime (Edge Functions)
proyecto_supabase-meta-1        → API de metadatos
proyecto_supabase-studio-1      → Supabase Studio UI
```

**Conexión app → Supabase:**
- La app web se conecta usando `VITE_SUPABASE_URL` (dominio público de Supabase)
- El cliente JS `@supabase/supabase-js` usa PostgREST para queries y GoTrue para auth
- No hay conexión directa a PostgreSQL desde el navegador

**Variables que Supabase self-hosted inyecta en Edge Functions:**
```
SUPABASE_URL            → URL interna del stack
SUPABASE_SERVICE_ROLE_KEY → Clave admin para operaciones privilegiadas
SUPABASE_ANON_KEY       → Clave pública
EXTERNAL_POSTGRES_HOST  → Si se usa PG externo
```

**Arquitectura híbrida documentada:**
El repo incluye `docs/MIGRATION_HYBRID_ARCHITECTURE.md` que describe una variante donde:
- Datos de negocio van en PostgreSQL externo (Easypanel)
- Auth, Storage, Edge Functions en Supabase Cloud (free tier)
Esta variante permite conexión directa desde n8n a PostgreSQL.

---

### Edge Functions — Sistema de despliegue real

Las Edge Functions **NO se despliegan** con `supabase functions deploy`. Se copian mediante scripts bash directamente al sistema de archivos del contenedor `edge-runtime`.

#### Estructura en el repo

```
supabase/functions/
├── version.json                   # Versión 1.9.0, changelog, lista de funciones
├── bootstrap-admin/index.ts       # Crear primer usuario admin
├── calendar-ical/index.ts         # Export calendario iCal
├── db-migrate/index.ts            # Verificación de migraciones (solo diagnóstico)
├── gmail-oauth-auth/index.ts      # Inicio OAuth2 Gmail
├── gmail-oauth-callback/index.ts  # Callback OAuth2 Gmail
├── google-calendar-auth/index.ts  # Inicio OAuth2 Google Calendar
├── google-calendar-callback/index.ts # Callback OAuth2 Google Calendar
├── google-calendar-events/index.ts   # Sincronización eventos
├── main/index.ts                  # ⚠️ CRÍTICO: dispatcher de funciones
├── ping/index.ts                  # Health check
├── process-notifications/index.ts # Procesar cola de notificaciones
├── send-email/index.ts            # Envío email SMTP
└── setup-database/index.ts        # Inicialización de BD
```

#### `main/index.ts` — El dispatcher crítico

Este archivo es **el punto de entrada único** para todas las Edge Functions en Supabase self-hosted. Sin él, ninguna función funciona. Usa la API interna `EdgeRuntime.userWorkers.create()`:

```typescript
// Recibe cualquier petición a /functions/v1/{nombre}
// Crea un worker Deno aislado por función
const worker = await EdgeRuntime.userWorkers.create({
  servicePath: `/home/deno/functions/${functionName}`,
  memoryLimitMb: 150,
  workerTimeoutMs: 60 * 1000,
  envVars,  // Hereda variables de entorno del runtime
});
const response = await worker.fetch(req);
```

> Si `main/index.ts` no está correctamente desplegado, todas las llamadas a Edge Functions devuelven 404.

#### `supabase/config.toml` — Configuración de JWT por función

```toml
[functions.send-email]
verify_jwt = false       # Permite llamadas sin token (desde n8n, crons)

[functions.google-calendar-auth]
verify_jwt = true        # Requiere usuario autenticado

[functions.google-calendar-callback]
verify_jwt = false       # OAuth callback no puede llevar JWT
```

**Problema:** `config.toml` se usa con Supabase CLI, pero en el despliegue self-hosted via bash, esta configuración **no se aplica automáticamente**. El `main/index.ts` implementa su propio mapa `FUNCTIONS_CONFIG` para controlar `verifyJWT`, que puede divergir de `config.toml`.

#### Sincronización de Edge Functions — scripts detallados

**sync-edge-functions.sh** (llamado desde startup.sh):

```
Método 1 — Volumen directo (EDGE_FUNCTIONS_VOLUME):
  rm -rf $EDGE_FUNCTIONS_VOLUME/*
  cp -r /app/supabase/functions/*/ → $EDGE_FUNCTIONS_VOLUME/
  cp version.json, import_map.json
  # Las funciones quedan disponibles inmediatamente (el runtime las lee del volumen)

Método 2 — Docker socket (/var/run/docker.sock):
  docker ps → encontrar contenedor con nombre "edge-functions|supabase-functions|edge-runtime"
  docker exec $EDGE rm -rf /home/deno/functions/*
  docker cp /app/supabase/functions/nombre/ → $EDGE:/home/deno/functions/nombre/
  docker restart $EDGE   # Obligatorio para recargar funciones
```

**deploy-functions.sh** (script independiente, llamado por post-deploy.sh):
- Versión más completa con backup antes de sobreescribir
- Crea `main/index.ts` healthcheck si no existe
- Variable usada: `SUPABASE_FUNCTIONS_VOLUME` (distinta de `EDGE_FUNCTIONS_VOLUME`)

> **Confusión de variables:** Hay dos variables similares (`EDGE_FUNCTIONS_VOLUME` en sync-edge-functions.sh y `SUPABASE_FUNCTIONS_VOLUME` en post-deploy.sh y deploy-functions.sh) que hacen lo mismo. Esta inconsistencia es deuda técnica.

#### Dependencias Deno de las funciones

Las Edge Functions usan URLs de CDN (sin lock file local):
```typescript
// Estándar Deno
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Supabase JS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// o import { createClient } from "npm:@supabase/supabase-js@2.86.0";
```

**Problema:** Versiones inconsistentes del cliente Supabase entre funciones (`2.49.1` en `db-migrate`, `2.86.0` en `send-email`). En red sin acceso a internet (VPS restrictivo), las funciones pueden fallar la primera vez hasta que Deno cachea los módulos.

---

### Sistema de migraciones — Flujo completo

Hay **dos sistemas paralelos** de migraciones que pueden divergir:

#### Sistema 1: `easypanel/init-scripts/` (producción real)

| Archivo | Propósito |
|---------|-----------|
| `full-schema.sql` | Schema completo para instancia Supabase (con `auth.users`) |
| `postgres-external-schema.sql` | Schema para PostgreSQL externo (sin auth de Supabase) |
| `INSTALL.sql` | Alias de `full-schema.sql` — el más usado en producción |
| `migrations/apply_all.sql` | Migrador idempotente que aplica versiones pendientes |
| `migrations/v1.X.Y_*.sql` | Migraciones individuales versionadas con SemVer |

**Flujo de primera instalación:**
```
1. Ejecutar full-schema.sql en Supabase SQL Editor
   → Crea todas las tablas, ENUMs, RLS, datos iniciales
2. El startup.sh aplica automáticamente apply_all.sql si detecta versiones pendientes
```

**Flujo de actualización:**
```
1. Deploy nuevo en Easypanel (git pull + docker build)
2. startup.sh conecta a PostgreSQL con EXTERNAL_POSTGRES_*
3. Llama a post-deploy.sh → ejecuta apply_all.sql
4. apply_all.sql verifica schema_versions y aplica solo lo pendiente
5. Cada migración es idempotente (puede re-ejecutarse sin error)
```

#### Sistema 2: `supabase/migrations/` (Supabase CLI — NO usado en producción)

Los 27 archivos en `supabase/migrations/` con nombres UUID son generados por **Lovable.ai** automáticamente y están pensados para `supabase db push` con Supabase CLI. En el deploy self-hosted de Hostinger **NO se aplican automáticamente** — solo existe `easypanel/init-scripts/` como sistema real.

**Riesgo:** Ambos sistemas pueden diverger silenciosamente. Hay cambios en `supabase/migrations/` (generados por Lovable) que no tienen correspondencia en `easypanel/init-scripts/migrations/`.

#### Versión actual del schema

| Archivo | Versión que cree ser |
|---------|---------------------|
| `startup.sh` | `v1.4.0` (CODE_SCHEMA_VERSION) |
| `post-deploy.sh` | `v1.3.0` (TARGET_VERSION) |
| `db-migrate/index.ts` | `v1.9.0` (CURRENT_VERSION) |
| `version.json` | `1.9.0` |
| `src/lib/schemaChecker.ts` | `v1.7.0` (TARGET_VERSION — usado por MigrationGate) |
| `README-migrations.md` | `v1.12.0` (última documentada, la real) |

**Inconsistencia crítica:** Hay 5 fuentes de verdad distintas para la versión del schema, todas desactualizadas respecto a la versión real `v1.12.0`. Esto causa falsos avisos de "migraciones pendientes" en los logs de startup y en el `MigrationGate` del frontend.

---

### Componente MigrationGate — Punto de entrada del usuario

`src/components/MigrationGate.tsx` es el **primer componente que se renderiza** al abrir la app. Antes de mostrar el CRM, ejecuta:

1. **Intenta llamar a la Edge Function `db-migrate`** (timeout 8 segundos)
   - Si responde: determina si el schema es `isUpToDate`, `needsMigration` o `requiresSetup`
   - Si no responde (timeout o self-hosted sin funciones): fallback a `checkSchemaDirectly()` vía Supabase JS

2. **Estados posibles del MigrationGate:**
   - `checking`: Girando mientras verifica
   - `verified`: Schema OK, botón "Continuar al CRM"
   - `needs-setup`: BD no inicializada — muestra instrucciones para ejecutar `full-schema.sql`
   - `needs-migration`: Hay versiones pendientes — muestra instrucciones para `apply_all.sql`
   - `error`: Error en verificación — permite continuar de todas formas

3. **Cuando las Edge Functions fallan en self-hosted**, el `MigrationGate` muestra instrucciones específicas de Easypanel con las rutas reales:
   ```
   Mount host:      /etc/easypanel/projects/PROYECTO/supabase/code/volumes/functions
   Mount container: /supabase-functions
   Mount host:      /var/run/docker.sock
   Mount container: /var/run/docker.sock
   Env: SUPABASE_FUNCTIONS_VOLUME=/supabase-functions
   Env: EDGE_RUNTIME_CONTAINER=PROYECTO_supabase-edge-functions
   ```

> **Nota sobre nombres de proyecto reales:** El código fuente de MigrationGate.tsx contiene en comentarios los nombres de proyecto reales de Easypanel (`mangas`, `nexo_n8n`) — deuda técnica menor pero revela infraestructura interna en el código de frontend.

---

### Nota sobre docker-compose

**No existe `docker-compose.yml` en este repositorio.** El stack de Supabase self-hosted (PostgreSQL, PostgREST, GoTrue, edge-runtime, Studio) es gestionado íntegramente por **Easypanel** a través de su template interno de Supabase. Easypanel genera y administra los contenedores Docker sin exponer un compose file al usuario. El repo solo contiene la aplicación CRM y sus scripts de integración con ese stack externo.

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Tipado estático |
| Vite + SWC | 5.4.19 | Build tool |
| React Router | 6.30.1 | Navegación SPA |
| TanStack Query | 5.83.0 | Server state / cache |
| React Hook Form | 7.61.1 | Formularios |
| Zod | 3.25.76 | Validación de esquemas |
| Tailwind CSS | 3.4.17 | Estilos utility-first |
| shadcn/ui + Radix | — | Componentes accesibles |
| Recharts | 2.15.4 | Gráficas y charts |
| pdf-lib | 1.17.1 | Generación PDF client-side |
| Fabric.js | 6.6.1 | Editor visual PDF |
| react-grid-layout | 2.0.0 | Dashboard drag & drop |
| date-fns | 3.6.0 | Utilidades de fecha |
| lucide-react | 0.462.0 | Iconografía |

### Backend / BaaS
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Supabase JS | 2.86.0 | Cliente DB + Auth |
| PostgreSQL | 15+ | Base de datos relacional |
| Supabase Auth | — | Autenticación JWT |
| Row Level Security | — | Seguridad a nivel de fila |
| Supabase Edge Functions | Deno | Lógica server-side |

### Edge Functions disponibles
| Función | Descripción |
|---------|-------------|
| `ping` | Health check |
| `send-email` | SMTP via denomailer |
| `db-migrate` | Gestor de migraciones |
| `bootstrap-admin` | Crear primer admin |
| `setup-database` | Inicializar schema |
| `google-calendar-auth` | OAuth2 Google Calendar |
| `google-calendar-callback` | Callback OAuth2 |
| `google-calendar-events` | Sincronización eventos |
| `gmail-oauth-auth` | OAuth2 Gmail |
| `gmail-oauth-callback` | Callback Gmail OAuth |
| `calendar-ical` | Export iCal |
| `process-notifications` | Colas de notificación |
| `main` | Dispatcher centralizado |

### Infraestructura
| Componente | Tecnología |
|------------|-----------|
| Containerización | Docker multi-stage (Node 20 builder + Nginx alpine) |
| Servidor web | Nginx en puerto 3000 |
| Orquestación | Easypanel (VPS) |
| CI/CD | Manual via scripts shell |
| Migraciones BD | Scripts SQL versionados + Edge Function |

### Schema de base de datos (tablas principales)
```
auth.users              → Usuarios Supabase (nativo)
user_roles              → Roles: admin, manager, user, readonly
schema_versions         → Control de migraciones
company_settings        → Config por instancia
clients                 → Clientes (status, segmento, SEPA)
contacts                → Contactos (vinculados a clients)
services                → Catálogo de servicios
campaigns               → Campañas de marketing
quotes                  → Presupuestos (líneas en quote_items)
contracts               → Contratos (billing_period, status)
invoices                → Facturas (series, IVA, IRPF)
invoice_items           → Líneas de factura
remittances             → Remesas SEPA
remittance_invoices     → Facturas en remesa
remittance_payments     → Pagos/devoluciones
expenses                → Gastos (categoría, archivo)
calendar_events         → Eventos (sincronización Google)
calendar_categories     → Categorías de eventos
email_settings          → Config SMTP por instancia
email_logs              → Log de emails enviados
notification_queue      → Cola de notificaciones
pdf_templates           → Plantillas PDF
entity_configurations   → Config personalizada por entidad
dashboard_widgets       → Widgets del dashboard
table_views             → Vistas guardadas de tablas
documents_rag           → RAG/AI (con pgvector opcional)
```

---

## 3. Deuda Técnica Identificada

### 3.1 Credenciales en repositorio
- **CRÍTICO:** El archivo `.env` está incluido en el repo con la `VITE_SUPABASE_PUBLISHABLE_KEY` y el Project ID expuestos. No existe `.gitignore` que excluya `.env` adecuadamente para producción.
- **CRÍTICO:** El `Dockerfile` imprime la URL de Supabase en los logs de build (`DEBUG_VITE_SUPABASE_URL`), que puede quedar visible en logs de CI.
- El `DEFAULT_SUPABASE_URL` y `DEFAULT_SUPABASE_ANON_KEY` están hardcodeados en `src/integrations/supabase/client.ts` como fallback. Si se fork el repo, cualquiera obtiene acceso al proyecto Supabase por defecto.

### 3.2 Arquitectura single-tenant
- Todo el schema está pensado para **un único cliente**: sin `tenant_id` en ninguna tabla, RLS basada solo en `user_id` o sin restricción por organización.
- Los `company_settings` son globales (1 fila), no por organización.
- `email_settings` es global (1 fila), sin multitenancy.
- Para desplegar un segundo cliente hay que **clonar todo el repo y re-desplegar** una instancia Supabase separada — proceso completamente manual.

### 3.3 Código generado por Lovable sin revisión
- El `package.json` se llama `"vite_react_shadcn_ts"` — nombre genérico de plantilla, no fue renombrado.
- `lovable-tagger` en devDependencies indica origen en plataforma Lovable.ai; el código fue generado automáticamente y puede contener patrones inconsistentes.
- Las migraciones tienen nombres UUID (ej: `20251203073102_0f92142e-...`), no nombres descriptivos, dificultando el seguimiento del historial.
- Dos sistemas de migración paralelos: carpeta `supabase/migrations/` (Supabase CLI) y `easypanel/init-scripts/` (scripts manuales SQL) — pueden divergir.

### 3.4 Gestión de estado
- No hay caché global configurada en `QueryClient` (opciones por defecto). Sin `staleTime` ni `gcTime` configurados, lo que puede causar re-fetching excesivo.
- Cada hook hace su propia query sin agrupación. Por ejemplo, `useClients`, `useContracts`, `useInvoices`... son independientes y no comparten invalidaciones cruzadas.

### 3.5 Sin tests
- No existe ningún archivo de test (`*.test.ts`, `*.spec.ts`, Vitest, Playwright, etc.).
- No hay configuración de CI/CD automatizada (GitHub Actions u similar).

### 3.6 Build sin optimización de chunks
```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: undefined,  // Bundle único, sin code splitting
  },
},
```
Con ~40 dependencias pesadas (Fabric.js 6.6, pdf-lib, recharts, react-grid-layout), el bundle JS resultante es grande. Sin lazy loading por ruta.

### 3.7 Autenticación con race condition conocida
En `useAuth.tsx` hay un `setTimeout(() => fetchUserRoles(...), 0)` con comentario explícito: *"Defer role fetching with setTimeout to prevent deadlock"*. Es un workaround que puede fallar en condiciones de red lentas o dispositivos móviles.

### 3.8 CORS abierto en Edge Functions
```typescript
"Access-Control-Allow-Origin": "*",
```
Todas las Edge Functions tienen CORS abierto (`*`). En producción debería restringirse al dominio del CRM.

### 3.9 PDF generado client-side
La generación de PDFs ocurre completamente en el navegador (pdf-lib + Fabric.js). Esto es pesado para dispositivos de gama baja y no permite generar PDFs desde procesos automáticos (n8n, crons, etc.).

---

## 4. Problemas de Escalabilidad

| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| Single-tenant: un Supabase por cliente | Coste alto, gestión compleja | ALTA |
| Sin paginación server-side en tablas | Con >500 registros, las listas se vuelven lentas | ALTA |
| Migraciones manuales sin automatizar | Error humano en cada deploy | ALTA |
| Bundle JS sin code-splitting | Tiempo de carga inicial alto | MEDIA |
| PDF generado en cliente | Falla en dispositivos lentos | MEDIA |
| Sin índices documentados en BD | Queries lentas a escala | MEDIA |
| Logs de email en tabla sin rotación | La tabla `email_logs` puede crecer indefinidamente | BAJA |
| Edge Functions sin rate limiting | Posible abuso en endpoints públicos | BAJA |

---

## 5. Oportunidades de Mejora

### Funcionales
- **Sistema de notificaciones en tiempo real** — La infra está preparada (`notification_queue`) pero no hay UI de notificaciones push en tiempo real.
- **Automatización de remesas** — El código SEPA es sólido; falta el cron automático mensual y las notificaciones de estado.
- **Firma digital de contratos** — Los contratos se generan en PDF pero no hay flujo de firma electrónica.
- **Portal de cliente** — Vista read-only para que los clientes vean sus facturas/contratos.
- **API pública REST** — Actualmente no hay endpoints documentados para integraciones externas.

### Técnicas
- **Code splitting por ruta** — Reducir el bundle inicial cargando módulos bajo demanda.
- **Server-side PDF** — Mover la generación de PDF a una Edge Function para consistencia y automatización.
- **Tests E2E** — Playwright para los flujos críticos (login, factura, contrato).
- **CI/CD con GitHub Actions** — Build, test y deploy automático al hacer push a `main`.
- **Paginación server-side** — Usar `.range()` de Supabase en todas las listas de datos.

---

## 6. Recomendaciones Prioritarias

### Inmediatas (antes de nueva instancia)
1. **Mover `.env` fuera del repo** — Añadir `.env` a `.gitignore` y usar secretos de Easypanel/GitHub en su lugar.
2. **Quitar credenciales hardcodeadas** del `client.ts` — Hacer que la URL y clave sean obligatorias vía env vars, sin fallback en código.
3. **Restringir CORS** en Edge Functions al dominio de producción.

### Para v2.0
4. **Diseñar schema multi-tenant** con `organization_id` en cada tabla y RLS basada en organización.
5. **Automatizar migraciones** con Supabase CLI y GitHub Actions.
6. **Implementar code splitting** con `React.lazy()` por ruta principal.
7. **Mover PDF a Edge Function** para soporte de generación automática.
8. **Configurar QueryClient** con `staleTime` y `gcTime` apropiados.
9. **Añadir tests unitarios** con Vitest para los hooks y utilidades críticas.
