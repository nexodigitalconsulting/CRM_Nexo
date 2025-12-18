# Despliegue CRM Web en Easypanel

Guía completa para desplegar el CRM con Supabase self-hosted en Easypanel.

## Arquitectura Híbrida

Este CRM soporta dos modos de operación:

| Modo | Edge Functions | Migraciones | Uso |
|------|---------------|-------------|-----|
| **Lovable Cloud** | ✅ Automáticas | ✅ Automáticas | Desarrollo en Lovable |
| **Easypanel/VPS** | ❌ No disponibles | 📋 Manuales o Script | Producción self-hosted |

El sistema detecta automáticamente el entorno y se adapta.

## Prerequisitos

1. **Easypanel** instalado en tu VPS
2. **Supabase** desplegado en Easypanel (template oficial)
3. **PostgreSQL** configurado (viene con Supabase)

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    EASYPANEL                        │
│  ┌─────────────┐    ┌─────────────┐                │
│  │   CRM Web   │───▶│  Supabase   │                │
│  │  (Docker)   │    │  (Kong API) │                │
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

## Paso 1: Crear Schema en Supabase

**IMPORTANTE**: El schema NO se crea automáticamente. Debes ejecutarlo manualmente.

1. Abre Supabase Studio en Easypanel
2. Ve a **SQL Editor**
3. Copia el contenido de `easypanel/init-scripts/full-schema.sql`
4. Ejecuta el SQL (F5 o botón Run)

---

## Paso 2: Crear Usuario Administrador

En Supabase self-hosted, la confirmación de email no está disponible por defecto. Debes crear el admin manualmente.

### 2.1 Crear usuario en Supabase Studio

1. Abre **Supabase Studio** → **Authentication** → **Users**
2. Click en **Add user** → **Create new user**
3. Introduce:
   - Email: `admin@tuempresa.com`
   - Password: `tu_contraseña_segura`
   - ✅ Marca "Auto Confirm User"
4. Click **Create user**
5. **Copia el UUID** del usuario creado (columna `UID`)

### 2.2 Asignar rol de administrador

1. Ve a **SQL Editor** en Supabase Studio
2. Ejecuta el siguiente SQL (reemplaza el UUID):

```sql
-- Reemplaza 'TU_UUID_AQUI' con el UUID del usuario creado
-- Ejemplo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- Crear perfil
INSERT INTO public.profiles (user_id, email, full_name)
VALUES ('TU_UUID_AQUI', 'admin@tuempresa.com', 'Administrador')
ON CONFLICT (user_id) DO NOTHING;

-- Asignar rol admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('TU_UUID_AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

3. Ejecuta el SQL (F5)
4. ✅ Ya tienes tu usuario administrador

---

## Paso 3: Crear Servicio CRM en Easypanel

1. En Easypanel, crea un nuevo **App** → **GitHub**
2. Conecta tu repositorio del CRM
3. Selecciona la rama principal (main/master)

---

## Paso 4: Configurar Build Args

En Easypanel, ve a la configuración del servicio CRM:

**Settings → Build → Build Arguments**

| Variable | Valor | Requerido |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://tu-supabase.dominio.com` | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | ✅ Sí |

### ¿Dónde encontrar estos valores?

- **VITE_SUPABASE_URL**: La URL de tu Supabase en Easypanel (normalmente el dominio configurado para el servicio Supabase)
- **VITE_SUPABASE_ANON_KEY**: En Supabase Studio → Settings → API → `anon` public key

> ⚠️ **Importante**: Estas variables se inyectan en BUILD TIME, no en runtime. Después de cambiarlas, debes hacer rebuild.

---

## Paso 5: Configurar Dominio

1. En la configuración del CRM en Easypanel
2. Ve a **Domains**
3. Añade tu dominio (ej: `crm.tudominio.com`)
4. Puerto interno: `80`

---

## Paso 6: Configurar Edge Functions (SIMPLIFICADO)

> ✅ **Método simplificado**: Las Edge Functions se sincronizan automáticamente usando `docker cp`
> directamente al contenedor edge-runtime. Solo necesitas montar el Docker socket.

### 6.1 Configurar el servicio CRM en EasyPanel

En el servicio CRM, configura **solo UN mount**:

#### Mounts (Advanced → Mounts)

| Host Path | Container Path | Descripción |
|-----------|----------------|-------------|
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker socket (requerido) |

> ℹ️ **Ya no necesitas** `SUPABASE_FUNCTIONS_VOLUME` ni el mount del volumen de funciones.
> El script usa `docker cp` para copiar directamente al contenedor edge-runtime.

### 6.2 Funcionamiento automático

Al hacer deploy del CRM:

1. ✅ Se construye la imagen con las funciones incluidas en `/app/supabase/functions`
2. ✅ Al iniciar, `startup.sh` ejecuta `sync-edge-functions.sh`
3. ✅ El script detecta automáticamente el contenedor edge-runtime
4. ✅ Las funciones se copian directamente con `docker cp`
5. ✅ Se crea la función `_main` (healthcheck requerido por edge-runtime)
6. ✅ Reinicia automáticamente edge-runtime
7. ✅ Las Edge Functions están disponibles sin intervención manual

### 6.3 Verificar funciones disponibles

```bash
# Desde tu VPS
curl https://tu-supabase.dominio.com/functions/v1/ping
```

Respuesta esperada:
```json
{"ok":true,"version":"1.2.0","environment":"hybrid"}
```

### 6.4 Sincronización manual (si es necesario)

```bash
# Ejecutar sincronización manualmente dentro del contenedor CRM
docker exec -it NOMBRE_CRM /app/easypanel/scripts/sync-edge-functions.sh

# O reiniciar el CRM (ejecutará la sincronización automáticamente)
docker restart NOMBRE_CRM
```

### 6.5 Lista de Edge Functions

| Función | Descripción |
|---------|-------------|
| `ping` | Health check y versión |
| `send-email` | Envío de emails SMTP |
| `process-notifications` | Procesamiento de notificaciones |
| `calendar-ical` | Exportación calendario iCal |
| `db-migrate` | Verificación de migraciones |
| `setup-database` | Setup inicial |
| `bootstrap-admin` | Creación de admin |
| `google-calendar-*` | Integración Google Calendar |
| `_main` | Healthcheck (auto-generado) |

---

## Paso 7: Deploy

1. Guarda la configuración
2. Haz click en **Deploy**
3. Espera a que se complete el build
4. El script post-deploy sincroniza automáticamente:
   - ✅ Migraciones de base de datos
   - ✅ Edge Functions (si `SUPABASE_FUNCTIONS_VOLUME` está configurado)

---

## Paso 8: Acceder al CRM

1. Accede a `https://tu-crm.dominio.com/auth`
2. Inicia sesión con el usuario admin creado en el Paso 2
3. ¡Listo!

> 💡 La página `/setup` ya no es necesaria para crear el admin, solo verifica la conexión y el schema.

---

## Verificación Post-Deploy

### Checklist

- [ ] CRM accesible en el dominio configurado
- [ ] Página `/auth` carga correctamente
- [ ] Login con usuario admin funciona
- [ ] Dashboard se muestra correctamente
- [ ] Conexión con Supabase funciona

### Tablas que deben existir

```
profiles, user_roles, company_settings, contacts, clients,
services, quotes, quote_services, contracts, contract_services,
invoices, invoice_services, expenses, remittances, campaigns,
calendar_categories, calendar_events, user_availability,
email_settings, email_templates, notification_rules, notification_queue,
pdf_settings, schema_versions
```

---

## Actualización de Instalaciones Existentes

Si tienes una instalación anterior y necesitas actualizar a la última versión:

### Método 1: Aplicador Automático (Recomendado)

1. Abre **Supabase SQL Editor** o tu cliente PostgreSQL
2. Ejecuta el contenido de `easypanel/init-scripts/migrations/apply_all.sql`
3. El script:
   - Detecta automáticamente la versión actual
   - Aplica solo las migraciones pendientes
   - Muestra un resumen de cambios

### Método 2: Migraciones Individuales

Si prefieres control granular:

1. Verifica tu versión actual:
```sql
SELECT get_current_schema_version();
```

2. Ejecuta las migraciones pendientes en orden:
   - `v1.1.0_2024-12-17_pdf_settings.sql`
   - `v1.2.0_2024-12-17_email_signature.sql`

### Verificar versión instalada

```sql
SELECT version, description, applied_at 
FROM schema_versions 
ORDER BY applied_at;
```

> 📚 Ver documentación completa en `README-migrations.md`

---

## Configuración de Email (Opcional)

Para habilitar notificaciones por email, configura SMTP en **Settings → Email** dentro del CRM.

> ⚠️ En Supabase self-hosted, la confirmación de email para nuevos usuarios NO está disponible a menos que configures SMTP en Supabase Auth.

---

## Troubleshooting

### "Error de conexión con Supabase"

1. Verifica que `VITE_SUPABASE_URL` es correcta
2. Verifica que `VITE_SUPABASE_ANON_KEY` es correcta
3. Asegúrate de haber hecho rebuild después de cambiar Build Args
4. Comprueba que Supabase está corriendo en Easypanel

### "Las tablas no se detectan"

1. Ejecuta `easypanel/init-scripts/full-schema.sql` en Supabase SQL Editor
2. Verifica que no hubo errores en la ejecución
3. Refresca la página del CRM

### "No puedo crear usuario admin"

En Supabase self-hosted:
1. Usa **Add user** → **Create new user** en Authentication
2. Marca **Auto Confirm User**
3. Ejecuta el SQL para asignar rol admin

### "Build lento o falla"

1. Verifica que las Build Args están configuradas
2. Revisa los logs del build en Easypanel
3. Asegúrate de que el Dockerfile está actualizado

### "CORS errors"

Verifica la configuración de Supabase:
- API URL debe ser accesible públicamente
- CORS debe permitir tu dominio del CRM

---

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `easypanel/init-scripts/full-schema.sql` | Schema completo de la base de datos |
| `Dockerfile` | Configuración del contenedor |
| `src/integrations/supabase/client.ts` | Cliente de Supabase |

---

## Replicar a Otro Proyecto

Para clonar el CRM a otro servidor:

1. Fork/clone el repositorio
2. En Easypanel del nuevo servidor:
   - Despliega Supabase
   - Ejecuta `full-schema.sql`
   - Crea usuario admin manualmente (Paso 2)
   - Crea el servicio CRM con Build Args
3. Accede a `/auth` e inicia sesión

---

## Resumen Rápido

```bash
# 1. En Supabase SQL Editor
→ Ejecutar: easypanel/init-scripts/full-schema.sql

# 2. En Supabase Studio → Authentication → Users
→ Add user → Create new user
→ Email: admin@tuempresa.com
→ Password: ****
→ ✅ Auto Confirm User
→ Copiar UUID

# 3. En Supabase SQL Editor
→ Ejecutar SQL para crear perfil y asignar rol admin

# 4. En Easypanel CRM Service
→ Build Args:
   VITE_SUPABASE_URL=https://supabase.tudominio.com
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# 5. Deploy y acceder a /auth
```

---

## Anexo A: Acceso Externo a PostgreSQL

Para conectar herramientas externas como **n8n**, **DBeaver**, o cualquier cliente PostgreSQL a la base de datos de Supabase en Easypanel:

### A.1 Obtener el nombre correcto de la red Docker

Ejecuta este comando para ver las redes disponibles:

```bash
docker network ls
```

Luego, para saber a qué red está conectado tu contenedor `nexo_n8n_supabase-db-1`, ejecuta:

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' nexo_n8n_supabase-db-1
```

El resultado será el nombre de la red que debes usar en lugar de `NETWORK`.

### A.2 Crear el contenedor socat

Si el comando anterior te devuelve, por ejemplo, `bridge`, entonces el comando correcto será:

```bash
docker run -d --name nexo_supabase_crm --network bridge -p 5460:5460 alpine/socat TCP-LISTEN:5460,fork,reuseaddr TCP:nexo_n8n_supabase-db-1:5432
```

### A.3 Abrir el puerto en el VPS

Dependiendo de tu firewall:

**UFW (Ubuntu/Debian):**
```bash
sudo ufw allow 5460/tcp
sudo ufw reload
```

**firewalld (CentOS/RHEL):**
```bash
sudo firewall-cmd --permanent --add-port=5460/tcp
sudo firewall-cmd --reload
```

**iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 5460 -j ACCEPT
sudo iptables-save
```

### A.4 Datos de conexión

| Parámetro | Valor |
|-----------|-------|
| **Host** | `tu-servidor.com` o IP del VPS |
| **Port** | `5460` (el puerto expuesto por socat) |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | La contraseña configurada en Supabase |

### A.5 Ejemplo conexión n8n

En n8n, crea una credencial **Postgres**:

```
Host: tu-servidor.com
Port: 5460
Database: postgres
User: postgres
Password: tu_password_de_supabase
SSL: Disable (si es red interna) o Require (si es externa)
```

### A.6 Seguridad

> ⚠️ **IMPORTANTE**: Exponer PostgreSQL a internet tiene riesgos de seguridad.

Recomendaciones:
- Usa contraseñas fuertes
- Configura firewall para permitir solo IPs conocidas
- Considera usar túnel SSH o VPN
- No uses el puerto estándar 5432 (usa uno diferente como 5460)

---

## Anexo B: Variables de Entorno

### Variables del CRM (Build Args)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de la API de Supabase | `https://supabase.tudominio.com` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | `eyJhbGciOiJI...` |

### Variables de Entorno (Runtime)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `EXTERNAL_POSTGRES_HOST` | Host PostgreSQL para migraciones | `supabase-db` |
| `EXTERNAL_POSTGRES_PORT` | Puerto PostgreSQL | `5432` |
| `EXTERNAL_POSTGRES_DB` | Base de datos | `postgres` |
| `EXTERNAL_POSTGRES_USER` | Usuario PostgreSQL | `postgres` |
| `EXTERNAL_POSTGRES_PASSWORD` | Contraseña PostgreSQL | `tu_password` |
| `SUPABASE_FUNCTIONS_VOLUME` | **NUEVO** Ruta al volumen de funciones | `/var/lib/easypanel/projects/supabase/volumes/functions` |

### Variables de Supabase (si necesitas personalizarlas)

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL |
| `JWT_SECRET` | Secreto para tokens JWT |
| `ANON_KEY` | Clave pública anónima |
| `SERVICE_ROLE_KEY` | Clave de servicio (privilegiada) |

---

## Anexo C: Scripts de Deployment

### Scripts disponibles

| Script | Descripción | Uso |
|--------|-------------|-----|
| `post-deploy.sh` | Migraciones + sync funciones | Automático en post-deploy |
| `deploy-functions.sh` | Solo sync de Edge Functions | Manual si es necesario |
| `verify-deployment.sh` | Verificación completa | Diagnóstico |

### Ejecución manual

```bash
# Verificar deployment
/app/easypanel/scripts/verify-deployment.sh

# Deploy solo funciones
/app/easypanel/scripts/deploy-functions.sh

# Después de deploy funciones, reiniciar edge-runtime
docker restart supabase-edge-functions
```

---

## Soporte

Si tienes problemas:
1. Ejecuta `/app/easypanel/scripts/verify-deployment.sh` para diagnóstico
2. Revisa los logs en Easypanel
3. Verifica la conexión con Supabase
4. Comprueba que el schema está correctamente instalado
5. Asegúrate de que el usuario admin tiene el rol correcto
6. Si las Edge Functions no funcionan, verifica `SUPABASE_FUNCTIONS_VOLUME`
