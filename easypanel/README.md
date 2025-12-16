# 🚀 CRM Web - Guía de Despliegue en Easypanel

## 📋 Requisitos Previos

Necesitas tener en Easypanel:
- ✅ **PostgreSQL** - Base de datos
- ✅ **Supabase** - Auth, RLS, Edge Functions

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    EASYPANEL                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────┐         ┌──────────────────┐    │
│   │   CRM Web    │◄───────►│    Supabase      │    │
│   │  (Esta App)  │         │  - Auth (login)  │    │
│   │  Puerto: 80  │         │  - RLS (seguridad)│    │
│   └──────────────┘         │  - Edge Functions│    │
│                            └────────┬─────────┘    │
│                                     │              │
│                            ┌────────▼─────────┐    │
│                            │    PostgreSQL    │    │
│                            │  (Base de datos) │    │
│                            └──────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Despliegue Completo (15 minutos)

### Paso 1: Crear la Base de Datos (CRÍTICO) ⚠️

> **El schema NO se crea automáticamente. Debes ejecutar el SQL manualmente.**

1. **Abre Supabase Studio** en Easypanel
2. Ve a **SQL Editor**
3. **Copia y pega** el contenido completo de:
   ```
   easypanel/init-scripts/full-schema.sql
   ```
4. **Ejecuta** el SQL (puede tardar 10-30 segundos)
5. **Verifica** en Table Editor que se crearon ~30 tablas

#### ¿Por qué manualmente?
- Las edge functions dependen de que Supabase esté funcionando
- Ejecutar SQL directamente es más confiable
- El archivo contiene TODO: tablas, RLS, triggers, datos iniciales

---

### Paso 2: Crear el Servicio CRM en Easypanel

1. Abre **Easypanel** → Tu proyecto
2. Clic en **"+ New"** → **"App"**
3. Selecciona **"GitHub"**
4. Conecta el repositorio del CRM
5. **Configuración de build**:
   - Build Command: *(vacío, usa Dockerfile)*
   - El Dockerfile ya está configurado

---

### Paso 3: Configurar Variables de Entorno

En Easypanel → CRM → **Environment** → **Build Args**:

| Variable | Valor | Requerido |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://tu-supabase.dominio.com` | ✅ Sí |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | ✅ Sí |
| `VITE_SUPABASE_BASIC_AUTH_USER` | `supabase` | ⚠️ Si hay proxy con auth |
| `VITE_SUPABASE_BASIC_AUTH_PASSWORD` | `tu_password` | ⚠️ Si hay proxy con auth |

> ⚠️ **Importante**: Estas variables se inyectan en BUILD TIME, no en runtime

### Variables de Autenticación Básica (Self-hosted)

Si tu Supabase está detrás de Kong/proxy con autenticación HTTP básica:

```
VITE_SUPABASE_BASIC_AUTH_USER=supabase
VITE_SUPABASE_BASIC_AUTH_PASSWORD=this_password_is_insecure_and_should_be_updated
```

Estas credenciales están en la configuración del servicio Supabase en Easypanel.

### Encontrar la Anon Key

En tu Supabase self-hosted, la anon key está en la configuración del servicio.
Formato típico:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

---

### Paso 4: Configurar Dominio

1. En Easypanel → CRM → **"Domains"**
2. Añade tu dominio: `crm.tudominio.com`
3. **Internal Port**: `80` (el Dockerfile usa nginx en puerto 80)
4. SSL se configura automáticamente

---

### Paso 5: Desplegar y Crear Admin

1. **Haz Deploy** en Easypanel
2. Espera a que termine (puede tardar 5-15 min la primera vez)
3. Abre: `https://crm.tudominio.com/setup`
4. **Verifica la conexión** a Supabase
5. **Crea el usuario administrador**:
   - Email
   - Contraseña
   - Nombre completo
6. ¡Accede al CRM!

---

## 🔍 Verificación Post-Despliegue

### Checklist

- [ ] SQL ejecutado en Supabase Studio
- [ ] ~30 tablas creadas en la base de datos
- [ ] Variables de entorno configuradas en Build Args
- [ ] Dominio configurado con puerto 80
- [ ] Deploy completado sin errores
- [ ] `/setup` conecta correctamente a Supabase
- [ ] Usuario admin creado
- [ ] Login funciona en `/auth`

### Tablas que deben existir

```
profiles, user_roles, clients, contacts, services,
quotes, quote_services, contracts, contract_services,
invoices, invoice_services, expenses, remittances,
campaigns, calendar_events, calendar_categories,
email_settings, email_templates, notification_rules,
company_settings, document_templates, entity_configurations,
user_table_views, user_availability, google_calendar_config
```

---

## 🛠️ Solución de Problemas

### "Database connection error" en /setup

**Causa**: Supabase no puede conectar a PostgreSQL

**Solución**:
1. Verifica que PostgreSQL está corriendo en Easypanel
2. Comprueba las variables de conexión en Supabase:
   - `EXTERNAL_POSTGRES_HOST`
   - `EXTERNAL_POSTGRES_PORT`
   - `EXTERNAL_POSTGRES_DB`
   - `EXTERNAL_POSTGRES_USER`
   - `EXTERNAL_POSTGRES_PASSWORD`
3. Revisa los logs de Supabase en Easypanel

### "Las tablas no se detectan"

**Causa**: No ejecutaste el SQL o usaste el Supabase incorrecto

**Solución**:
1. Verifica que `VITE_SUPABASE_URL` apunta al Supabase correcto
2. Ejecuta el SQL de `full-schema.sql` en Supabase Studio
3. Re-deploy el CRM después de cambiar variables

### Build tarda mucho (>15 minutos)

**Causa**: Rate limiting de Docker Hub o conexión lenta

**Solución**:
- Es normal la primera vez (descarga imágenes)
- Builds posteriores serán más rápidos (caché)

### Error de CORS

**Causa**: Supabase no tiene configurado el dominio del CRM

**Solución**:
1. En Supabase → Settings → API
2. Añade el dominio del CRM a los orígenes permitidos

---

## 🔄 Replicar a Otro Proyecto

Para crear otro CRM independiente:

1. Crea nuevo proyecto en Easypanel con PostgreSQL + Supabase
2. **Ejecuta el SQL** en el nuevo Supabase Studio
3. Añade el CRM desde GitHub (mismo repositorio)
4. Configura las variables apuntando al nuevo Supabase
5. Crea nuevo admin en `/setup`

Cada proyecto tiene su propia base de datos independiente.

---

## 📁 Archivos de Referencia

| Archivo | Descripción |
|---------|-------------|
| `easypanel/init-scripts/full-schema.sql` | Schema completo para Supabase |
| `easypanel/init-scripts/postgres-external-schema.sql` | Schema para PostgreSQL sin Supabase |
| `Dockerfile` | Configuración de build (nginx puerto 80) |
| `docs/MIGRATION_HYBRID_ARCHITECTURE.md` | Arquitectura detallada |

---

## ✅ Resumen de Pasos

| # | Acción | Dónde |
|---|--------|-------|
| 1 | Ejecutar SQL del schema | Supabase Studio → SQL Editor |
| 2 | Crear servicio CRM | Easypanel → New → App → GitHub |
| 3 | Configurar variables | Easypanel → CRM → Environment → Build Args |
| 4 | Configurar dominio | Easypanel → CRM → Domains (puerto 80) |
| 5 | Deploy | Easypanel → CRM → Deploy |
| 6 | Crear admin | `crm.tudominio.com/setup` |
