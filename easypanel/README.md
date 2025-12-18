# Despliegue CRM en Easypanel

Guía simplificada para desplegar el CRM con Supabase self-hosted.

## Instalación Rápida (2 pasos)

### Paso 1: Base de Datos

```sql
-- En Supabase SQL Editor, ejecutar:
-- Archivo: easypanel/init-scripts/INSTALL.sql
```

### Paso 2: Edge Functions (en VPS)

```bash
# Encontrar contenedores
CRM=$(docker ps --format "{{.Names}}" | grep -i crm | head -1)
EDGE=$(docker ps --format "{{.Names}}" | grep -i functions | head -1)

# Copiar funciones
docker cp $CRM:/app/supabase/functions/. /tmp/edge-functions/
docker cp /tmp/edge-functions/. $EDGE:/home/deno/functions/
docker restart $EDGE

# Verificar
curl https://tu-supabase.dominio.com/functions/v1/ping
```

¡Listo! Accede a `/auth` y crea tu usuario admin.

---

## Guía Completa

### Prerequisitos

1. **Easypanel** instalado en VPS
2. **Supabase** desplegado en Easypanel
3. **PostgreSQL** (viene con Supabase)

### Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    EASYPANEL                        │
│  ┌─────────────┐    ┌─────────────┐                │
│  │   CRM Web   │───▶│  Supabase   │                │
│  │   :80       │    │   :8000     │                │
│  └─────────────┘    └──────┬──────┘                │
│                            │                        │
│                     ┌──────▼──────┐                │
│                     │ PostgreSQL  │                │
│                     │   :5432     │                │
│                     └─────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## 1. Crear Schema en Supabase

1. Abre **Supabase Studio → SQL Editor**
2. Copia el contenido de `easypanel/init-scripts/INSTALL.sql`
3. Ejecuta (F5)

El script:
- ✅ Detecta componentes existentes
- ✅ Solo añade lo que falta
- ✅ Configura RLS automáticamente
- ✅ Crea datos iniciales

---

## 2. Crear Usuario Administrador

### En Supabase Studio

1. **Authentication → Users → Add user**
2. Email: `admin@tuempresa.com`
3. Password: `tu_contraseña_segura`
4. ✅ Marca **Auto Confirm User**
5. Copia el **UUID** del usuario

### Asignar rol admin (SQL Editor)

```sql
-- Reemplaza TU_UUID con el UUID copiado
INSERT INTO public.user_roles (user_id, role)
VALUES ('TU_UUID', 'admin');
```

---

## 3. Configurar CRM en Easypanel

### Build Arguments (requeridos)

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://tu-supabase.dominio.com` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (de Supabase → Settings → API) |

> ⚠️ Después de cambiar Build Args, hacer **Rebuild**

---

## 4. Sincronizar Edge Functions

Las Edge Functions NO se sincronizan automáticamente. Hay 3 métodos:

### Método A: Comandos Manuales (Recomendado)

Ejecutar en el VPS después de cada deploy:

```bash
# 1. Identificar contenedores
CRM=$(docker ps --format "{{.Names}}" | grep -i crm | head -1)
EDGE=$(docker ps --format "{{.Names}}" | grep -i functions | head -1)

echo "CRM: $CRM"
echo "Edge: $EDGE"

# 2. Copiar funciones
docker cp $CRM:/app/supabase/functions/. /tmp/edge-functions/
docker cp /tmp/edge-functions/. $EDGE:/home/deno/functions/

# 3. Reiniciar edge-runtime
docker restart $EDGE

# 4. Verificar
sleep 5
curl https://tu-supabase.dominio.com/functions/v1/ping
```

### Método B: Variable de Entorno (Automático)

Añade en Easypanel → CRM → Environment Variables:

```
EDGE_FUNCTIONS_VOLUME=/etc/easypanel/projects/PROYECTO/supabase/.../volumes/functions
```

Para encontrar la ruta:
```bash
find /etc/easypanel -name "functions" -type d 2>/dev/null | grep volumes
```

### Método C: Docker Socket (Automático)

1. En Easypanel → CRM → Mounts:
   - Host: `/var/run/docker.sock`
   - Container: `/var/run/docker.sock`

2. Environment Variables:
   ```
   EDGE_RUNTIME_CONTAINER=proyecto_supabase-functions-1
   ```

---

## 5. Verificación

### Checklist

- [ ] CRM accesible en tu dominio
- [ ] `/auth` carga correctamente
- [ ] Login con admin funciona
- [ ] Edge Functions responden:

```bash
# Ping
curl https://supabase.dominio.com/functions/v1/ping

# Respuesta esperada
{"ok":true,"version":"1.4.0"}
```

### Edge Functions disponibles

| Función | Descripción |
|---------|-------------|
| `ping` | Health check |
| `db-migrate` | Estado de migraciones |
| `send-email` | Envío emails SMTP |
| `bootstrap-admin` | Crear admin |
| `google-calendar-*` | Integración Google |
| `main` | Dispatcher (auto) |

---

## Actualizar Instalación Existente

### Actualizar Base de Datos

```sql
-- En SQL Editor, ejecutar:
-- easypanel/init-scripts/INSTALL.sql

-- El script detecta lo que ya existe y solo añade lo nuevo
```

### Actualizar Edge Functions

```bash
# Después de pull/deploy del CRM
CRM=$(docker ps --format "{{.Names}}" | grep -i crm | head -1)
EDGE=$(docker ps --format "{{.Names}}" | grep -i functions | head -1)

docker cp $CRM:/app/supabase/functions/. /tmp/edge-functions/
docker cp /tmp/edge-functions/. $EDGE:/home/deno/functions/
docker restart $EDGE
```

---

## Troubleshooting

### "Error de conexión con Supabase"

1. Verificar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
2. Hacer Rebuild después de cambiar Build Args
3. Verificar que Supabase está corriendo

### "Edge Functions no responden"

1. Verificar que el contenedor edge-functions está corriendo:
   ```bash
   docker ps | grep functions
   ```

2. Copiar funciones manualmente (ver Método A arriba)

3. Ver logs:
   ```bash
   docker logs $(docker ps -q --filter "name=functions") --tail 50
   ```

### "Las tablas no existen"

Ejecutar `INSTALL.sql` en Supabase SQL Editor

### "No puedo crear usuario admin"

En Supabase self-hosted, marcar **Auto Confirm User** al crear el usuario

---

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `easypanel/init-scripts/INSTALL.sql` | Schema completo (TODO EN UNO) |
| `supabase/functions/main/index.ts` | Dispatcher Edge Functions |
| `Dockerfile` | Configuración contenedor |

---

## Resumen de Comandos

```bash
# === INSTALACIÓN INICIAL ===

# 1. SQL (en Supabase SQL Editor)
# → Ejecutar: easypanel/init-scripts/INSTALL.sql

# 2. Edge Functions (en VPS)
CRM=$(docker ps --format "{{.Names}}" | grep -i crm | head -1)
EDGE=$(docker ps --format "{{.Names}}" | grep -i functions | head -1)
docker cp $CRM:/app/supabase/functions/. /tmp/ef/
docker cp /tmp/ef/. $EDGE:/home/deno/functions/
docker restart $EDGE

# 3. Crear admin (en Supabase SQL Editor)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'tu@email.com';

# === ACTUALIZACIONES ===

# Re-ejecutar INSTALL.sql (es idempotente)
# Copiar funciones de nuevo con los comandos del paso 2
```
