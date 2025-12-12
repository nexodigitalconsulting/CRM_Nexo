# 🚀 Réplica CRM - Guía 1-Click

## Tienes: Supabase + Postgres + n8n ya funcionando
## Necesitas: Desplegar el CRM y crear las tablas

---

## Paso 1: Crear Tablas en tu Postgres (1 vez)

Ejecuta el archivo `init-scripts/full-schema.sql` en tu Supabase Studio:

1. Accede a tu **Supabase Studio** → **SQL Editor**
2. Copia y pega el contenido de `easypanel/init-scripts/full-schema.sql`
3. Ejecuta ▶️

---

## Paso 2: Desplegar CRM en Easypanel

### Opción A: Desde GitHub (Recomendado)

1. En Easypanel → Nuevo Servicio → **App**
2. Selecciona **GitHub**
3. Conecta tu repositorio
4. Configura:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Opción B: Dockerfile

1. En Easypanel → Nuevo Servicio → **App**
2. Selecciona **Dockerfile**
3. Usa el `Dockerfile` incluido en este directorio

---

## Paso 3: Variables de Entorno

En Easypanel, configura estas variables para el CRM:

```env
VITE_SUPABASE_URL=https://TU_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

**¿Dónde encontrar estos valores?**
- En tu Supabase Studio → Settings → API
- O en la configuración de tu Supabase self-hosted

---

## Paso 4: Configurar Dominio

1. En el servicio CRM → **Domains**
2. Añade tu dominio: `crm.tudominio.com`
3. Easypanel configurará SSL automáticamente

---

## Paso 5: Crear Usuario Admin

En Supabase Studio → SQL Editor:

```sql
-- Después de registrar el primer usuario
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'tu@email.com';
```

---

## ✅ ¡Listo!

Tu CRM está conectado a tu infraestructura existente.
