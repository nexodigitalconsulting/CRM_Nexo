# 🚀 Réplica CRM - Guía 1-Click para Easypanel

## 📋 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                    EASYPANEL                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────┐         ┌──────────────────┐    │
│   │   CRM Web    │◄───────►│    Supabase      │    │
│   │  (Esta App)  │         │  - Auth (login)  │    │
│   │              │         │  - RLS (seguridad)│    │
│   └──────────────┘         │  - Edge Functions│    │
│                            └────────┬─────────┘    │
│                                     │              │
│                            ┌────────▼─────────┐    │
│                            │    PostgreSQL    │    │
│                            │  (Base de datos) │    │
│                            └──────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Servicios necesarios (ya disponibles en Easypanel):**
- ✅ PostgreSQL → Almacena los datos
- ✅ Supabase → Gestiona usuarios, seguridad y funciones
- ✅ CRM Web → Esta aplicación (se despliega desde GitHub)

---

## 🎯 Despliegue en 4 Pasos (10 minutos)

### Paso 1: Crear el Servicio CRM en Easypanel (2 min)

1. Abre **Easypanel** en tu navegador
2. Ve a tu proyecto existente (donde ya tienes Postgres + Supabase)
3. Clic en **"+ New"** → **"App"**
4. Selecciona **"GitHub"**
5. Conecta tu repositorio del CRM
6. Configura:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Paso 2: Configurar Variables de Entorno (1 min)

En el servicio CRM recién creado, ve a **"Environment"** y añade:

| Variable | Valor | Dónde encontrarlo |
|----------|-------|-------------------|
| `VITE_SUPABASE_URL` | `https://tu-supabase.tudominio.com` | URL de tu Supabase en Easypanel |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase → Settings → API → anon key |

> 💡 **Tip**: La anon key está en la configuración de tu Supabase self-hosted

### Paso 3: Configurar Dominio (1 min)

1. En el servicio CRM → **"Domains"**
2. Añade tu dominio: `crm.tudominio.com`
3. Easypanel configurará SSL automáticamente

### Paso 4: Ejecutar Setup Inicial (5 min)

Una vez desplegado el CRM:

1. **Abre**: `https://crm.tudominio.com/setup`

2. **Paso 1 - Crear Tablas**:
   - La página te mostrará si las tablas ya existen
   - Si no existen, copia el SQL que aparece
   - Abre **Supabase Studio** → **SQL Editor**
   - Pega y ejecuta el SQL
   - Vuelve a `/setup` y verifica

3. **Paso 2 - Crear Admin**:
   - Introduce tu email y contraseña
   - Clic en **"Crear Usuario Admin"**
   - ¡Listo! Ya puedes acceder al CRM

---

## 📁 Archivo SQL (Referencia)

El SQL completo está en: `easypanel/init-scripts/full-schema.sql`

Este archivo contiene:
- ✅ Todas las tablas del CRM
- ✅ Políticas de seguridad (RLS)
- ✅ Triggers automáticos
- ✅ Datos iniciales (servicios de ejemplo, plantillas de email)

---

## 🔄 Replicar a Otro Proyecto

Para crear otro CRM idéntico en otro proyecto:

1. **En Easypanel**: Repite los pasos 1-4 con el nuevo proyecto
2. **Cada proyecto** tiene su propia base de datos independiente
3. **El código** es el mismo (mismo repositorio GitHub)

---

## 🛠️ Solución de Problemas

### "Las tablas no se detectan"
- Verifica que ejecutaste el SQL en Supabase Studio
- Comprueba que `VITE_SUPABASE_URL` apunta al Supabase correcto

### "Error al crear usuario admin"
- Verifica que las tablas existen primero
- Comprueba los logs en Easypanel → CRM → Logs

### "No puedo acceder al CRM"
- Verifica que el dominio está configurado correctamente
- Espera 2-3 minutos para que el SSL se active

---

## 📞 Resumen Rápido

| Qué hacer | Dónde |
|-----------|-------|
| Crear servicio CRM | Easypanel → New → App → GitHub |
| Configurar variables | Easypanel → CRM → Environment |
| Ejecutar SQL inicial | Supabase Studio → SQL Editor |
| Crear admin | `crm.tudominio.com/setup` |
| Ver logs | Easypanel → CRM → Logs |

---

## ✅ Checklist de Despliegue

- [ ] Servicio CRM creado en Easypanel
- [ ] Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas
- [ ] Dominio configurado
- [ ] SQL ejecutado en Supabase Studio
- [ ] Usuario admin creado desde `/setup`
- [ ] Acceso al CRM verificado
