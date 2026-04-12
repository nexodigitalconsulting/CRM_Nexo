# GUÍA DE REPLICACIÓN — Deploy a Nuevo Cliente
**Versión:** Para CRM Suite v2.0 (Next.js + PostgreSQL + Better Auth + R2)
**Audiencia:** Desarrolladores de Nexo Digital Consulting

---

## Contexto de Rentabilidad

| Clientes activos | Modelo recomendado | Coste infra/cliente | Precio mínimo viable |
|-----------------|-------------------|--------------------|--------------------|
| 1–5 | Instancia dedicada (este documento) | €5–8/mes | €89/mes |
| 6–14 | Instancia dedicada en VPS compartido | €3–5/mes | €69/mes |
| 15+ | Multi-tenant (ver ARQUITECTURA-V2.md) | <€2/mes | €49/mes |

> **Stack v2 vs v1:** En v1 cada cliente necesitaba un KVM 2 (8 GB, ~€11/mes) por el peso de Supabase self-hosted (~1.3 GB RAM). En v2, el stack ocupa ~500 MB — un KVM 1 (4 GB, ~€5/mes) puede alojar 2–3 clientes cómodamente.
>
> **Cada hora de réplica manual a €35/hora = €35 de coste.** El script `new-client.sh` reduce 3–4 horas a ~30 minutos, ahorrando **€88–105 por cliente nuevo**.

---

## Qué incluye cada cliente en v2

Cada cliente obtiene:
- Un contenedor **PostgreSQL 15** (`postgres:15-alpine`) — base de datos limpia
- Un contenedor **CRM Next.js** con Better Auth y Drizzle integrados
- Su propio **bucket Cloudflare R2** (logos, facturas PDF, adjuntos)
- Su propio dominio o subdominio con HTTPS automático (Easypanel + Let's Encrypt)
- Configuración SMTP propia (en Settings del CRM, guardada en BD)

> **No hay Supabase.** No hay GoTrue, no hay PostgREST, no hay edge-runtime, no hay Studio, no hay Kong. Solo PostgreSQL + Next.js.

**Tiempo estimado:** 30–45 minutos (con script), 60–90 minutos (primera vez manual)

---

## Pre-requisitos

### Infraestructura
- [ ] VPS con mínimo 1 vCPU / 2 GB RAM / 20 GB SSD (KVM 1 para cliente solo, KVM 2 para 2–3 clientes)
- [ ] Easypanel instalado en el VPS (`curl -sSL https://easypanel.io/install.sh | sh`)
- [ ] Dominio o subdominio apuntando al VPS (registro A en DNS)
- [ ] Acceso SSH al VPS

### Cloudflare (por cliente)
- [ ] Cuenta Cloudflare gratuita o cuenta compartida con múltiples buckets
- [ ] Bucket R2 creado para el cliente
- [ ] API Token R2 con permisos lectura/escritura sobre el bucket

### Accesos
- [ ] Panel Easypanel (usuario/contraseña del VPS)
- [ ] Acceso al repo `nexodigitalconsulting/vps-crm-suite` en GitHub

---

## Paso 0: Convenciones de nomenclatura

En toda esta guía, reemplaza los placeholders:

| Placeholder | Ejemplo real | Descripción |
|-------------|-------------|-------------|
| `PROYECTO` | `empresa-abc` | Nombre del proyecto en Easypanel (sin espacios, minúsculas) |
| `cliente.com` | `empresa-abc.com` | Dominio base del cliente |
| `crm.cliente.com` | `crm.empresa-abc.com` | Subdominio del CRM |
| `R2_BUCKET` | `crm-empresa-abc` | Nombre del bucket R2 |

En Easypanel, los contenedores del proyecto se nombran automáticamente como:
```
PROYECTO_postgres-1      ← Base de datos PostgreSQL
PROYECTO_crm-web-1       ← Aplicación CRM Next.js
```

---

## Paso 1: Crear el proyecto y la base de datos en Easypanel

### 1.1 Crear proyecto

1. En Easypanel → **New Project** → nombre: `PROYECTO` (ej: `empresa-abc`)
2. Click **Create**

### 1.2 Añadir servicio PostgreSQL

1. Dentro del proyecto → **+ Service → From Template → PostgreSQL**
2. Configurar el servicio:
   - **Name:** `postgres`
   - **Image:** `postgres:15-alpine` (verificar que no usa una versión más antigua)
   - **POSTGRES_DB:** `crm`
   - **POSTGRES_USER:** `postgres`
   - **POSTGRES_PASSWORD:** generar con `openssl rand -base64 24` — guardar en vault
3. Click **Deploy**
4. Esperar ~30 segundos hasta que el contenedor esté `Running`

### 1.3 Verificar conexión

Desde SSH en el VPS:
```bash
docker exec -it PROYECTO_postgres-1 psql -U postgres -d crm -c "SELECT version();"
# Debe responder: PostgreSQL 15.x ...
```

---

## Paso 2: Inicializar el schema de base de datos

### Opción A: Via el script de startup (automático)

El contenedor CRM aplica las migraciones Drizzle automáticamente al arrancar. Si se despliega el CRM después del PostgreSQL, el schema se crea solo. Ver Paso 4.

### Opción B: Manual (para verificación o problemas)

Desde SSH en el VPS:
```bash
# Conectar al contenedor PostgreSQL
docker exec -it PROYECTO_postgres-1 psql -U postgres -d crm

# O desde la máquina local (si tienes el puerto expuesto):
psql "postgresql://postgres:PASSWORD@VPS_IP:5432/crm"
```

Ejecutar el schema inicial:
```bash
# Desde la máquina local, con el archivo del repo:
cat easypanel/init-scripts/full-schema.sql | docker exec -i PROYECTO_postgres-1 psql -U postgres -d crm
```

Verificar tablas creadas:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Debe devolver ~25 tablas (clients, contacts, invoices, contracts, etc.)
-- Más las tablas de Better Auth: user, session, account, organization, member, invitation
```

---

## Paso 3: Configurar Cloudflare R2

### 3.1 Crear bucket R2

1. Ir a [dash.cloudflare.com](https://dash.cloudflare.com) → R2 Object Storage
2. **Create bucket** → nombre: `crm-PROYECTO` (ej: `crm-empresa-abc`)
3. Location: Auto (o Europe si el VPS está en EU)
4. Anotar el **Account ID** (aparece en la URL: `dash.cloudflare.com/ACCOUNT_ID/r2`)

### 3.2 Crear API Token R2

1. En R2 → **Manage R2 API Tokens** → **Create API Token**
2. Permisos: **Object Read & Write** (solo para este bucket)
3. Anotar:
   - `Access Key ID` → `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`

### 3.3 (Opcional) Habilitar acceso público al bucket

Si el cliente necesita que logos e imágenes sean accesibles via URL pública:
1. En el bucket → **Settings → Public Access → Allow Access**
2. Anotar la URL pública: `https://pub-XXXX.r2.dev` → `R2_PUBLIC_URL`

---

## Paso 4: Desplegar el CRM en Easypanel

### 4.1 Crear servicio CRM

1. En Easypanel → proyecto `PROYECTO` → **+ Service → App**
2. Configurar origen:
   - **Source:** GitHub
   - **Repository:** `nexodigitalconsulting/vps-crm-suite`
   - **Branch:** `main`
   - **Build method:** Dockerfile (detectado automáticamente)

### 4.2 Variables de entorno

> ⚠️ En v2, **TODAS** las variables van en **Environment Variables**. No hay Build Arguments. Si algo no funciona, basta con hacer restart (no rebuild).

```bash
# === BASE DE DATOS ===
DATABASE_URL=postgresql://postgres:[POSTGRES_PASSWORD]@PROYECTO_postgres-1:5432/crm

# === BETTER AUTH ===
BETTER_AUTH_SECRET=[ejecutar: openssl rand -base64 32]
BETTER_AUTH_URL=https://crm.cliente.com
NEXT_PUBLIC_APP_URL=https://crm.cliente.com

# === CLOUDFLARE R2 ===
R2_ACCOUNT_ID=[Account ID de Cloudflare]
R2_ACCESS_KEY_ID=[del API Token R2]
R2_SECRET_ACCESS_KEY=[del API Token R2]
R2_BUCKET_NAME=crm-PROYECTO
R2_PUBLIC_URL=https://pub-XXXX.r2.dev    # Solo si el bucket es público

# === GOOGLE CALENDAR / GMAIL (opcional, configurar si el cliente usa estas integraciones) ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# === RUNTIME ===
NODE_ENV=production
PORT=3000
```

### 4.3 Configurar dominio

- **Domain:** `crm.cliente.com`
- **HTTPS:** activado (Easypanel gestiona Let's Encrypt automáticamente)
- **Puerto:** `3000`

### 4.4 Sin mounts necesarios

> En v2 no hay ningún mount especial que configurar. No hay Edge Functions que sincronizar, no hay volúmenes de funciones Deno, no hay Docker socket.

### 4.5 Primer deploy

1. Click **Deploy** en Easypanel
2. Monitorizar logs de build (~3–5 minutos): compilación Next.js → imagen Docker
3. Al arrancar el contenedor, revisar los logs de startup:
   ```
   === CRM Suite v2 — Startup ===
   ✅ PostgreSQL conectado
   ✅ Migraciones aplicadas (Drizzle)
   Iniciando Next.js en puerto 3000...
   ✓ Ready in Xs
   ```
4. Si los logs muestran error de conexión a BD, verificar que `DATABASE_URL` apunta correctamente a `PROYECTO_postgres-1`

---

## Paso 5: Crear usuario administrador

### 5.1 Via endpoint de bootstrap (primera vez)

```bash
curl -X POST "https://crm.cliente.com/api/admin/bootstrap" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa-cliente.com",
    "password": "TempPass2026!",
    "organizationName": "Empresa ABC S.L.",
    "organizationSlug": "empresa-abc"
  }'
# Respuesta: {"ok": true, "organizationId": "xxx", "userId": "xxx"}
```

> El endpoint `/api/admin/bootstrap` solo funciona una vez — si ya existe una organización, devuelve error. Está protegido para evitar múltiples ejecuciones.

### 5.2 Via psql (alternativa manual)

```sql
-- 1. Crear organización en tabla de Better Auth
INSERT INTO organization (id, name, slug, created_at, updated_at)
VALUES (gen_random_uuid(), 'Empresa ABC S.L.', 'empresa-abc', now(), now())
RETURNING id;  -- Copiar este ID

-- 2. El usuario admin se crea en el primer login via /auth/register
-- (o usar el panel de admin de Better Auth si está habilitado)
```

---

## Paso 6: Configuración inicial del CRM

Con el admin creado, hacer login en `https://crm.cliente.com` y configurar:

### 6.1 Datos de la empresa (Settings → Empresa)
- Nombre de la empresa, CIF/NIF
- Dirección completa, teléfono, email
- Logo (se sube a Cloudflare R2 automáticamente)
- Colores corporativos

### 6.2 Email (Settings → Correo Electrónico)
- Servidor SMTP, puerto, seguridad (TLS/SSL)
- Email y nombre del remitente
- Firma de email en HTML
- Click en **Probar conexión** para verificar

### 6.3 Series de facturación (Settings → Facturación)
- Serie principal: `FF` (Facturas)
- Serie presupuestos: `PR`
- Serie contratos: `CT`
- Número inicial y año

### 6.4 Checklist de verificación

```
✅ Login con admin funciona
✅ Dashboard carga sin errores de consola
✅ Puede crear un cliente de prueba
✅ Puede crear una factura de prueba
✅ Email de prueba enviado y recibido
✅ PDF de factura generado correctamente
✅ Logo del cliente aparece en PDF
✅ R2: verificar que el logo se subió al bucket
```

---

## docker-compose.yml para desarrollo local

Para probar localmente antes de desplegar en VPS, usar este `docker-compose.dev.yml`:

```yaml
# docker/docker-compose.dev.yml
# Uso: docker compose -f docker/docker-compose.dev.yml up

version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-devpassword}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d crm"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:-devpassword}@db:5432/crm
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:-dev-secret-min-32-chars-here}
      BETTER_AUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:-}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:-}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY:-}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME:-crm-dev}
      NODE_ENV: development
    depends_on:
      db:
        condition: service_healthy
    volumes:
      # Para desarrollo: montar el código fuente
      - ../apps/web:/app/apps/web
      - /app/node_modules     # Evitar que el mount pise node_modules del contenedor

volumes:
  pgdata:
```

> Para desarrollo local con R2, usar el emulador `wrangler r2 dev` o simplemente configurar un bucket de desarrollo en Cloudflare.

---

## Archivo .env de referencia por cliente

Guardar en vault seguro (1Password, Bitwarden):

```env
# ============================================
# CRM Suite v2 — Cliente: [NOMBRE CLIENTE]
# Proyecto Easypanel: [PROYECTO]
# Creado: [FECHA]
# ============================================

# === DOMINIO ===
CRM_URL=https://crm.empresa-cliente.com

# === BASE DE DATOS ===
DATABASE_URL=postgresql://postgres:PASSWORD@PROYECTO_postgres-1:5432/crm
POSTGRES_PASSWORD=contraseña_segura_aqui

# === BETTER AUTH ===
BETTER_AUTH_SECRET=secreto_generado_aqui
BETTER_AUTH_URL=https://crm.empresa-cliente.com

# === CLOUDFLARE R2 ===
R2_ACCOUNT_ID=account_id_cloudflare
R2_ACCESS_KEY_ID=access_key_r2
R2_SECRET_ACCESS_KEY=secret_key_r2
R2_BUCKET_NAME=crm-empresa-abc
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# === GOOGLE (si se configuró) ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# === ADMIN INICIAL ===
ADMIN_EMAIL=admin@empresa-cliente.com
ADMIN_PASSWORD=contraseña_temporal_cambiar_en_primer_login

# === VPS ===
VPS_IP=[IP del VPS]
EASYPANEL_URL=https://panel.[vps].com
```

---

## Script de Réplica Automatizado — new-client.sh

El script `easypanel/scripts/new-client.sh` automatiza el 90% del proceso. **Tiempo estimado: 30–35 minutos con supervisión mínima.**

```bash
#!/bin/bash
# easypanel/scripts/new-client.sh
# Uso:
#   export EASYPANEL_TOKEN="tu_api_token_easypanel"
#   ./new-client.sh --project empresa-abc --domain empresa-abc.com \
#                   --admin-email admin@empresa.com --vps 123.123.123.123 \
#                   --r2-account-id XXXX --r2-key YYYY --r2-secret ZZZZ

set -euo pipefail

# === Parsear argumentos ===
PROJECT=""
DOMAIN=""
ADMIN_EMAIL=""
VPS_HOST=""
R2_ACCOUNT_ID=""
R2_ACCESS_KEY=""
R2_SECRET=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --project)   PROJECT="$2";       shift 2 ;;
    --domain)    DOMAIN="$2";        shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --vps)       VPS_HOST="$2";      shift 2 ;;
    --r2-account-id) R2_ACCOUNT_ID="$2"; shift 2 ;;
    --r2-key)    R2_ACCESS_KEY="$2"; shift 2 ;;
    --r2-secret) R2_SECRET="$2";     shift 2 ;;
    *) echo "Argumento desconocido: $1"; exit 1 ;;
  esac
done

CRM_DOMAIN="crm.$DOMAIN"
BUCKET_NAME="crm-$PROJECT"
EASYPANEL_API="https://$VPS_HOST/api"
PG_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
AUTH_SECRET=$(openssl rand -base64 32)

echo "=== Creando cliente: $PROJECT ==="
echo "    Dominio CRM: $CRM_DOMAIN"
echo "    Admin: $ADMIN_EMAIL"
echo ""

# PASO 1: Crear proyecto en Easypanel
echo "1/7 Creando proyecto Easypanel..."
curl -sf -X POST "$EASYPANEL_API/projects" \
  -H "Authorization: Bearer $EASYPANEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$PROJECT\"}" > /dev/null
echo "    ✅ Proyecto creado"

# PASO 2: Desplegar PostgreSQL
echo "2/7 Desplegando PostgreSQL..."
curl -sf -X POST "$EASYPANEL_API/projects/$PROJECT/services/postgres" \
  -H "Authorization: Bearer $EASYPANEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"postgres\",
    \"image\": \"postgres:15-alpine\",
    \"env\": {
      \"POSTGRES_DB\": \"crm\",
      \"POSTGRES_USER\": \"postgres\",
      \"POSTGRES_PASSWORD\": \"$PG_PASSWORD\"
    }
  }" > /dev/null

echo "    Esperando que PostgreSQL esté listo (~30s)..."
sleep 30

# Verificar que PostgreSQL responde
MAX_TRIES=10
for i in $(seq 1 $MAX_TRIES); do
  if ssh "root@$VPS_HOST" "docker exec ${PROJECT}_postgres-1 pg_isready -U postgres -d crm" 2>/dev/null; then
    echo "    ✅ PostgreSQL listo"
    break
  fi
  echo "    Intento $i/$MAX_TRIES..."
  sleep 10
done

# PASO 3: Desplegar CRM Next.js
echo "3/7 Desplegando CRM..."
curl -sf -X POST "$EASYPANEL_API/projects/$PROJECT/services/crm-web" \
  -H "Authorization: Bearer $EASYPANEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"app\",
    \"source\": {
      \"type\": \"github\",
      \"repo\": \"nexodigitalconsulting/vps-crm-suite\",
      \"branch\": \"main\"
    },
    \"env\": {
      \"DATABASE_URL\": \"postgresql://postgres:${PG_PASSWORD}@${PROJECT}_postgres-1:5432/crm\",
      \"BETTER_AUTH_SECRET\": \"$AUTH_SECRET\",
      \"BETTER_AUTH_URL\": \"https://$CRM_DOMAIN\",
      \"NEXT_PUBLIC_APP_URL\": \"https://$CRM_DOMAIN\",
      \"R2_ACCOUNT_ID\": \"$R2_ACCOUNT_ID\",
      \"R2_ACCESS_KEY_ID\": \"$R2_ACCESS_KEY\",
      \"R2_SECRET_ACCESS_KEY\": \"$R2_SECRET\",
      \"R2_BUCKET_NAME\": \"$BUCKET_NAME\",
      \"NODE_ENV\": \"production\",
      \"PORT\": \"3000\"
    },
    \"domain\": \"$CRM_DOMAIN\",
    \"port\": 3000
  }" > /dev/null
echo "    Build iniciado. Esperando (~5 min)..."

# PASO 4: Esperar build
sleep 300

# PASO 5: Verificar que el CRM responde
echo "4/7 Verificando CRM..."
MAX_TRIES=12
for i in $(seq 1 $MAX_TRIES); do
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" "https://$CRM_DOMAIN/api/health" 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "    ✅ CRM respondiendo (HTTP $HTTP)"
    break
  fi
  echo "    Intento $i/$MAX_TRIES (HTTP $HTTP)..."
  sleep 30
done

# PASO 6: Crear organización y admin
echo "5/7 Creando organización y usuario admin..."
TEMP_PASS="TempPass$(date +%Y)!"
BOOTSTRAP_RESULT=$(curl -sf -X POST "https://$CRM_DOMAIN/api/admin/bootstrap" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$TEMP_PASS\",
    \"organizationName\": \"$PROJECT\",
    \"organizationSlug\": \"$PROJECT\"
  }")
echo "    ✅ Admin creado"

# PASO 7: Guardar credenciales
echo "6/7 Guardando credenciales..."
mkdir -p .clients
cat > ".clients/$PROJECT.env" << EOF
# ============================================
# CRM Suite v2 — Cliente: $PROJECT
# Creado: $(date +%Y-%m-%d)
# ============================================

CRM_URL=https://$CRM_DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$TEMP_PASS  # CAMBIAR EN PRIMER LOGIN

DATABASE_URL=postgresql://postgres:${PG_PASSWORD}@${PROJECT}_postgres-1:5432/crm
POSTGRES_PASSWORD=$PG_PASSWORD

BETTER_AUTH_SECRET=$AUTH_SECRET
BETTER_AUTH_URL=https://$CRM_DOMAIN

R2_ACCOUNT_ID=$R2_ACCOUNT_ID
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY
R2_SECRET_ACCESS_KEY=$R2_SECRET
R2_BUCKET_NAME=$BUCKET_NAME

VPS_IP=$VPS_HOST
PROJECT_EASYPANEL=$PROJECT
EOF
echo "    ✅ Credenciales guardadas en .clients/$PROJECT.env"

echo ""
echo "=== ✅ Cliente $PROJECT desplegado correctamente ==="
echo ""
echo "    CRM:   https://$CRM_DOMAIN"
echo "    Admin: $ADMIN_EMAIL / $TEMP_PASS"
echo "    ⚠️  El admin debe cambiar la contraseña en el primer login"
echo ""
echo "    Credenciales guardadas en: .clients/$PROJECT.env"
echo "    Mover a vault seguro (1Password/Bitwarden)"
```

> Añadir `.clients/` al `.gitignore`. Las credenciales nunca deben commitearse.

---

## Variantes de customización

### Variante A: Branding del cliente

Configurar desde **Settings → Empresa** en el CRM (se guarda en BD):
- Nombre, CIF/NIF, dirección, teléfono, email
- Logo (se sube a R2 automáticamente)
- Colores primario y secundario (para PDFs y sidebar)

O directamente en SQL tras el bootstrap:
```sql
UPDATE company_settings SET
  name = 'Empresa ABC S.L.',
  tax_id = 'B12345678',
  address = 'Calle Mayor 1, 28001 Madrid',
  primary_color = '#1E40AF'
WHERE org_id = '[ORG_ID]';
```

### Variante B: Módulos desactivados

En v2 los módulos se activan/desactivan desde **Settings → Módulos** (guardado en `organizations.settings` JSONB). No requiere tocar código.

### Variante C: R2 con cuenta Cloudflare compartida

Si se usa una única cuenta Cloudflare para todos los clientes:
- Crear un bucket por cliente: `crm-empresa-abc`, `crm-empresa-xyz`
- Crear un API Token por bucket (con permisos limitados a ese bucket)
- Los tokens de distintos clientes no pueden acceder a buckets de otros

### Variante D: SMTP personalizado

El SMTP se configura en el CRM (Settings → Correo Electrónico) y se guarda en la tabla `email_settings` por organización. No es una variable de entorno — esto permite cambiar el SMTP sin restart del contenedor.

---

## Actualización de un cliente existente

Para actualizar el CRM a una nueva versión:

```bash
# Trigger rebuild en Easypanel (recoge los últimos cambios del repo)
curl -X POST "https://VPS_HOST/api/projects/PROYECTO/services/crm-web/deploy" \
  -H "Authorization: Bearer $EASYPANEL_TOKEN"

# El contenedor al arrancar ejecuta automáticamente las migraciones Drizzle pendientes
# No es necesario ejecutar nada manualmente
```

---

## Troubleshooting

### Error: "Cannot connect to database"
```
Causa: DATABASE_URL incorrecta o PostgreSQL no listo
Solución:
1. Verificar que PROYECTO_postgres-1 está corriendo en Easypanel
2. Comprobar que DATABASE_URL tiene el hostname correcto del contenedor
3. Verificar la contraseña en DATABASE_URL vs POSTGRES_PASSWORD configurado
4. Desde SSH: docker exec PROYECTO_postgres-1 pg_isready -U postgres -d crm
```

### Error: "BETTER_AUTH_SECRET missing"
```
Causa: Variable de entorno no configurada
Solución:
1. Verificar en Easypanel → Servicio CRM → Environment Variables
2. BETTER_AUTH_SECRET debe tener al menos 32 caracteres
3. Restart del contenedor (no rebuild necesario)
```

### Error: "R2 upload failed" / Logo no aparece
```
Causa: Credenciales R2 incorrectas o bucket no existe
Solución:
1. Verificar R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY en Easypanel
2. Confirmar que el bucket R2_BUCKET_NAME existe en el panel Cloudflare
3. Confirmar que el API Token tiene permisos de escritura en ese bucket
4. Restart del contenedor tras corregir las variables
```

### Error: "No puedo hacer login"
```
Causa: Usuario no creado o BETTER_AUTH_URL incorrecto
Solución:
1. Verificar que BETTER_AUTH_URL = la URL pública del CRM (con https://)
2. Re-ejecutar el endpoint de bootstrap: POST /api/admin/bootstrap
3. O crear usuario directamente en BD via psql
```

### Error: "Migrations failed on startup"
```
Causa: BD no accesible al arrancar o schema inconsistente
Solución:
1. Revisar logs de startup para ver el error exacto de Drizzle
2. Verificar que PostgreSQL está corriendo: docker ps | grep postgres
3. Conectar manualmente: docker exec -it PROYECTO_postgres-1 psql -U postgres -d crm
4. Si el problema persiste, borrar el contenedor PostgreSQL y recrear (ATENCIÓN: borra los datos)
```

### Error: "Emails no se envían"
```
Causa: SMTP no configurado o mal configurado
Solución:
1. Ir a Settings → Correo Electrónico en el CRM
2. Configurar el servidor SMTP del cliente
3. Usar el botón "Probar conexión" para verificar
4. Los logs del servidor están en: Easypanel → Servicio CRM → Logs
```

---

## Checklist Final de Entrega al Cliente

```
[ ] CRM accesible en el dominio acordado con HTTPS
[ ] Login con usuario admin funciona
[ ] Dashboard carga sin errores en consola del navegador
[ ] Módulos principales accesibles: Clientes, Facturas, Contratos
[ ] Email de prueba enviado y recibido correctamente
[ ] PDF de factura generado con logo del cliente
[ ] Logo del cliente visible en sidebar y PDFs
[ ] Series de facturación configuradas (FF, PR, CT)
[ ] Usuario admin ha cambiado la contraseña temporal
[ ] Credenciales guardadas en vault seguro
[ ] Backup inicial documentado (snapshot Easypanel o dump PostgreSQL)
[ ] Contacto de soporte comunicado al cliente
```

---

## Ficha de cliente (guardar en sistema interno)

```
Cliente:              [NOMBRE]
Fecha de alta:        [FECHA]
CRM URL:              https://crm.[cliente].com
VPS Provider:         Hostinger
VPS IP:               [IP]
Easypanel URL:        https://panel.[vps].com
Proyecto Easypanel:   [PROYECTO]
Admin email:          admin@[cliente].com
Credenciales en:      1Password → vault [cliente]
Plan contratado:      [Starter/Pro/Enterprise]
Precio:               [€/mes]
Setup fee cobrado:    [€]
Próxima renovación:   [FECHA]
R2 Bucket:            crm-[proyecto]
Notas:                [Módulos activos, configuración especial, etc.]
```
