# CRM Nexo v2.0

CRM completo para gestión de clientes, facturación, contratos y campañas. Construido con Next.js 15 App Router, Drizzle ORM y Better Auth. Sin dependencias de Supabase — stack 100% propio.

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

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- (Opcional) Cloudflare R2 para almacenamiento de archivos

---

## Instalación local

```bash
# 1. Clonar
git clone https://github.com/nexodigitalconsulting/Crm_Nexo.git
cd Crm_Nexo

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Ejecutar migraciones
npm run db:migrate

# 5. Arrancar desarrollo
npm run dev
```

La app estará en `http://localhost:3000`.

---

## Variables de entorno

Copia `.env.example` a `.env` y rellena:

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | Si |
| `BETTER_AUTH_SECRET` | Secret 32+ chars (`openssl rand -hex 32`) | Si |
| `BETTER_AUTH_URL` | URL pública de la app | Si |
| `NEXT_PUBLIC_APP_URL` | URL pública (browser) | Si |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | Opcional |
| `R2_ACCESS_KEY_ID` | R2 Access Key | Opcional |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key | Opcional |
| `R2_BUCKET_NAME` | Nombre del bucket R2 | Opcional |
| `R2_PUBLIC_URL` | URL pública del bucket | Opcional |
| `SMTP_HOST` | Servidor SMTP | Opcional |
| `SMTP_PORT` | Puerto SMTP (587) | Opcional |
| `SMTP_USER` | Usuario SMTP | Opcional |
| `SMTP_PASS` | Contraseña SMTP | Opcional |
| `SMTP_FROM` | Email remitente | Opcional |

---

## Deploy con Docker

### Build local
```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://tudominio.com \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_URL=https://tudominio.com \
  -t crm-nexo .

docker run -p 3000:3000 \
  --env-file .env \
  crm-nexo
```

---

## Deploy en EasyPanel

EasyPanel construye y despliega la imagen directamente desde GitHub.

### 1. Crear el servicio

1. EasyPanel → **Crear proyecto** → nombre `crm-nexo`
2. Crear servicio tipo **App**
3. **Source** → **GitHub** → conectar repo `Crm_Nexo`, branch `main`
4. Build method: **Dockerfile** (detectado automáticamente)

### 2. Build arguments

```
NEXT_PUBLIC_APP_URL=https://tudominio.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://tudominio.com
```

### 3. Variables de entorno (runtime)

```
DATABASE_URL=postgresql://user:pass@db-host:5432/Crm_Nexo
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
```
(Resto de variables opcionales según necesidad)

### 4. Dominio

**Domains** → añadir dominio → SSL automático con Let's Encrypt.

### 5. Auto Deploy

Activar **Auto Deploy** para que cada push a `main` redepliegue automáticamente.

### Base de datos en EasyPanel

1. Crear servicio **PostgreSQL** en EasyPanel
2. Copiar la connection string interna
3. Pegar en `DATABASE_URL` del servicio App

---

## Scripts npm

```bash
npm run dev          # Desarrollo con HMR
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:generate  # Generar migraciones Drizzle
npm run db:migrate   # Aplicar migraciones
npm run db:studio    # Drizzle Studio (UI de BD)
```

---

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   ├── auth/          # Better Auth handler
│   │   ├── data/          # API routes Drizzle (50+)
│   │   │   ├── clients/
│   │   │   ├── invoices/
│   │   │   └── ...
│   │   ├── email/
│   │   └── health/
│   └── auth/              # Login / registro
├── src/
│   ├── components/
│   ├── hooks/             # React Query hooks
│   ├── lib/
│   │   ├── api/           # Fetch helpers (cliente)
│   │   ├── api-server.ts  # Utils servidor
│   │   ├── auth.ts        # Better Auth config
│   │   ├── db.ts          # Drizzle client
│   │   └── schema.ts      # Schema PostgreSQL
│   └── views/
├── .env.example
├── Dockerfile
├── drizzle.config.ts
└── next.config.ts
```

---

## Changelog

### v2.0.0 — 2026-04-12
- Migración completa Supabase → Drizzle ORM (0 imports Supabase)
- 50+ API routes con Next.js App Router
- Autenticación migrada a Better Auth
- Dockerfile multi-stage para EasyPanel
- TypeScript: 0 errores

### v1.x
- Versión inicial con Supabase

---

## Licencia

Privado — Nexo Digital Consulting
