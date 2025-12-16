# Despliegue CRM Web en Easypanel

Guía completa para desplegar el CRM con Supabase self-hosted en Easypanel.

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

## Paso 1: Crear Schema en Supabase

**IMPORTANTE**: El schema NO se crea automáticamente. Debes ejecutarlo manualmente.

1. Abre Supabase Studio en Easypanel
2. Ve a **SQL Editor**
3. Copia el contenido de `easypanel/init-scripts/full-schema.sql`
4. Ejecuta el SQL (F5 o botón Run)

## Paso 2: Crear Servicio CRM en Easypanel

1. En Easypanel, crea un nuevo **App** → **GitHub**
2. Conecta tu repositorio del CRM
3. Selecciona la rama principal (main/master)

## Paso 3: Configurar Build Args

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

## Paso 4: Configurar Dominio

1. En la configuración del CRM en Easypanel
2. Ve a **Domains**
3. Añade tu dominio (ej: `crm.tudominio.com`)
4. Puerto interno: `80`

## Paso 5: Deploy

1. Guarda la configuración
2. Haz click en **Deploy**
3. Espera a que se complete el build

## Paso 6: Configuración Inicial

1. Accede a `https://tu-crm.dominio.com/setup`
2. El sistema verificará:
   - Conexión con Supabase
   - Schema de base de datos
3. Crea el usuario administrador
4. ¡Listo!

## Verificación Post-Deploy

### Checklist

- [ ] CRM accesible en el dominio configurado
- [ ] Página `/setup` carga correctamente
- [ ] Conexión con Supabase funciona
- [ ] Schema detectado correctamente
- [ ] Usuario admin creado

### Tablas que deben existir

```
profiles, user_roles, company_settings, contacts, clients,
services, quotes, quote_services, contracts, contract_services,
invoices, invoice_services, expenses, remittances, campaigns,
calendar_categories, calendar_events, user_availability,
email_settings, email_templates, notification_rules, notification_queue
```

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

### "Build lento o falla"

1. Verifica que las Build Args están configuradas
2. Revisa los logs del build en Easypanel
3. Asegúrate de que el Dockerfile está actualizado

### "CORS errors"

Verifica la configuración de Supabase:
- API URL debe ser accesible públicamente
- CORS debe permitir tu dominio del CRM

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `easypanel/init-scripts/full-schema.sql` | Schema completo de la base de datos |
| `Dockerfile` | Configuración del contenedor |
| `src/integrations/supabase/client.ts` | Cliente de Supabase |

## Replicar a Otro Proyecto

Para clonar el CRM a otro servidor:

1. Fork/clone el repositorio
2. En Easypanel del nuevo servidor:
   - Despliega Supabase
   - Ejecuta `full-schema.sql`
   - Crea el servicio CRM con Build Args
3. Accede a `/setup` y crea admin

## Resumen Rápido

```bash
# 1. En Supabase SQL Editor
→ Ejecutar: easypanel/init-scripts/full-schema.sql

# 2. En Easypanel CRM Service
→ Build Args:
   VITE_SUPABASE_URL=https://supabase.tudominio.com
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# 3. Deploy y acceder a /setup
```
