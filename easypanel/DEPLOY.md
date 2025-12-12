# 🚀 Guía de Despliegue CRM en Easypanel

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         EASYPANEL                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   CRM Web    │  │     n8n      │  │   Supabase Studio    │  │
│  │  (React App) │  │ (Workflows)  │  │   (Admin Panel)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                     │              │
│         └──────────────────┼─────────────────────┘              │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │      Kong       │                           │
│                   │  (API Gateway)  │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│    ┌───────────┬───────────┼───────────┬───────────┐           │
│    │           │           │           │           │           │
│ ┌──▼──┐   ┌────▼───┐  ┌────▼───┐  ┌────▼───┐  ┌───▼────┐     │
│ │Auth │   │  REST  │  │Realtime│  │Storage │  │Functions│     │
│ └──┬──┘   └────┬───┘  └────┬───┘  └────┬───┘  └───┬────┘     │
│    │           │           │           │           │           │
│    └───────────┴───────────┼───────────┴───────────┘           │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │   PostgreSQL    │                           │
│                   │  (Base datos)   │                           │
│                   └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Requisitos Previos

- VPS con mínimo 4GB RAM, 2 CPU, 40GB disco
- Docker y Docker Compose instalados
- Easypanel instalado ([guía](https://easypanel.io/docs/installation))
- Dominios configurados apuntando al VPS

## Dominios Necesarios

Para cada proyecto CRM necesitas estos subdominios:

| Servicio | Subdominio Ejemplo |
|----------|-------------------|
| CRM Web | crm.tudominio.com |
| API Supabase | api.tudominio.com |
| Supabase Studio | studio.tudominio.com |
| n8n | n8n.tudominio.com |

---

## 📦 Despliegue Paso a Paso

### Paso 1: Preparar Archivos

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/crm-project.git
cd crm-project

# Construir el frontend
npm install
npm run build

# Ir al directorio de despliegue
cd easypanel

# Ejecutar script de preparación
chmod +x scripts/deploy.sh scripts/generate-keys.sh
./scripts/deploy.sh mi_proyecto
```

### Paso 2: Generar Claves JWT

```bash
# Generar claves JWT personalizadas
./scripts/generate-keys.sh

# Copiar las claves generadas al archivo .env
```

### Paso 3: Configurar Variables de Entorno

Edita el archivo `.env` generado:

```bash
# Archivo: mi_proyecto/.env

# IMPORTANTE: Cambiar estos valores
PROJECT_NAME=mi_crm
SUPABASE_PUBLIC_URL=https://api.tudominio.com
SITE_URL=https://crm.tudominio.com
N8N_WEBHOOK_URL=https://n8n.tudominio.com

# Credenciales (generadas automáticamente, pero verifica)
POSTGRES_PASSWORD=tu_password_seguro
JWT_SECRET=tu_jwt_secret

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
```

### Paso 4: Desplegar en Easypanel

#### Opción A: Usando Docker Compose (Recomendado)

1. Accede a Easypanel: `https://tu-vps-ip:3000`

2. Crea un nuevo proyecto: `mi_crm`

3. Añade servicio **"Docker Compose"**

4. Pega el contenido de `docker-compose.yml`

5. En la pestaña **Environment**, añade las variables del `.env`

6. Configura **Domains** para cada servicio:
   - `crm-web` → `crm.tudominio.com`
   - `kong` → `api.tudominio.com`
   - `studio` → `studio.tudominio.com`
   - `n8n` → `n8n.tudominio.com`

7. Haz clic en **Deploy**

#### Opción B: Servicios Individuales

Si prefieres más control, puedes añadir cada servicio por separado:

1. **PostgreSQL** (App → Postgres)
2. **Redis** (opcional, para caché)
3. **Kong** (App → Docker Image: `kong:2.8.1`)
4. **Auth** (App → Docker Image: `supabase/gotrue:v2.143.0`)
5. **REST** (App → Docker Image: `postgrest/postgrest:v12.0.1`)
6. **Storage** (App → Docker Image: `supabase/storage-api:v0.46.4`)
7. **n8n** (App → Docker Image: `n8nio/n8n:latest`)
8. **CRM Web** (App → Nginx con build del frontend)

---

## 🔧 Configuración Post-Despliegue

### 1. Verificar Servicios

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs
docker-compose logs -f postgres
docker-compose logs -f auth
docker-compose logs -f kong
```

### 2. Crear Usuario Admin

Accede a Supabase Studio (`studio.tudominio.com`) y:

1. Ve a **Authentication** → **Users**
2. Crea un nuevo usuario con email y contraseña
3. Ve a **SQL Editor** y ejecuta:

```sql
-- Asignar rol de admin al primer usuario
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'tu_email@ejemplo.com';
```

### 3. Configurar Email

Ve a `crm.tudominio.com/settings` y configura el SMTP.

### 4. Importar Datos (Opcional)

Si tienes datos de otra instalación:

```bash
# Exportar de la instalación anterior
pg_dump -h host_origen -U postgres -d postgres > backup.sql

# Importar en la nueva instalación
psql -h localhost -U postgres -d postgres < backup.sql
```

---

## 🔄 Replicar a Nuevo Proyecto

Para crear un nuevo proyecto CRM idéntico:

```bash
# 1. Ejecutar script de despliegue con nuevo nombre
./scripts/deploy.sh proyecto_nuevo

# 2. Editar .env con nuevos dominios
nano proyecto_nuevo/.env

# 3. Copiar a Easypanel
# Crear nuevo proyecto en Easypanel
# Pegar docker-compose.yml
# Configurar variables de entorno
# Configurar dominios
# Deploy!
```

---

## 🔒 Seguridad

### Checklist de Seguridad

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Generar nuevas claves JWT para cada proyecto
- [ ] Configurar SSL/TLS (Easypanel lo hace automáticamente)
- [ ] Restringir acceso a Supabase Studio (opcional)
- [ ] Configurar backups automáticos
- [ ] Habilitar 2FA para usuarios admin

### Backups Automáticos

Añade este script a un cron job:

```bash
#!/bin/bash
# /scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups

# Backup PostgreSQL
docker exec ${PROJECT_NAME}_postgres pg_dump -U postgres postgres > $BACKUP_DIR/db_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/db_$DATE.sql

# Eliminar backups de más de 30 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```bash
# Añadir a crontab (backup diario a las 3am)
0 3 * * * /scripts/backup.sh
```

---

## 🐛 Solución de Problemas

### Error: "Connection refused" en PostgreSQL

```bash
# Verificar que postgres está corriendo
docker-compose logs postgres

# Reiniciar postgres
docker-compose restart postgres
```

### Error: "Invalid JWT token"

1. Verifica que `JWT_SECRET` es el mismo en todos los servicios
2. Regenera las claves con `./scripts/generate-keys.sh`
3. Actualiza las variables en Easypanel
4. Reinicia los servicios

### Error: "RLS policy violation"

El usuario no tiene los permisos correctos. Verifica:

1. Que el usuario tiene un rol asignado en `user_roles`
2. Que las políticas RLS están correctamente configuradas

### n8n no se conecta a PostgreSQL

```bash
# Verificar conexión
docker exec -it ${PROJECT_NAME}_n8n sh
# Dentro del contenedor:
nc -zv postgres 5432
```

---

## 📊 Monitorización

### Métricas Básicas

Easypanel incluye monitorización básica. Para métricas avanzadas:

1. Añade **Prometheus** + **Grafana** al stack
2. Configura alertas para:
   - Uso de CPU > 80%
   - Uso de memoria > 85%
   - Disco > 90%
   - Errores 5xx en los logs

---

## 📞 Soporte

- **Documentación Supabase**: https://supabase.com/docs
- **Documentación Easypanel**: https://easypanel.io/docs
- **Documentación n8n**: https://docs.n8n.io

---

## Changelog

### v1.0.0 (2025-02-10)
- Versión inicial del sistema de despliegue
- Soporte para Supabase self-hosted
- Integración con n8n
- Scripts de automatización
