# CRM Web - Sistema de Gestión Empresarial

> **CRM completo con gestión de clientes, facturas, contratos, presupuestos y más**

## 🏗️ Arquitectura

Este CRM soporta **dos modos de despliegue**:

| Modo | Backend | Ideal para |
|------|---------|------------|
| **Lovable Cloud** | Supabase gestionado | Desarrollo rápido, prototipado |
| **Self-hosted (Easypanel)** | Supabase + PostgreSQL en VPS | Producción, control total |

## 🚀 Inicio Rápido

### Opción 1: Lovable (Recomendado para empezar)

1. Abre el proyecto en [Lovable](https://lovable.dev/projects/103cb171-61c9-4650-a3cf-21a027d0cee1)
2. El schema ya está configurado automáticamente
3. Ve a `/auth` para crear tu cuenta
4. ¡Listo!

### Opción 2: Self-hosted en Easypanel

Consulta la guía detallada: [`easypanel/README.md`](./easypanel/README.md)

**Resumen rápido:**
1. Despliega PostgreSQL + Supabase en Easypanel
2. **Ejecuta el SQL manualmente** en Supabase Studio (ver abajo)
3. Despliega el CRM desde GitHub
4. Configura las variables de entorno
5. Crea el usuario admin desde `/setup`

## 📊 Creación del Schema de Base de Datos

### ⚠️ Importante: El schema NO se crea automáticamente

Cuando conectas las claves de Supabase, **las tablas NO se crean solas**. Debes ejecutar el SQL manualmente.

### Para Lovable Cloud (ya configurado)
- ✅ El schema ya existe
- ✅ No necesitas hacer nada

### Para Supabase Self-hosted (Easypanel)

**Paso 1: Abrir Supabase Studio**
- En Easypanel → Tu proyecto Supabase → Accede al Studio

**Paso 2: Ejecutar el SQL**
- Ve a **SQL Editor** en Supabase Studio
- Copia el contenido de [`easypanel/init-scripts/full-schema.sql`](./easypanel/init-scripts/full-schema.sql)
- Ejecuta el SQL completo

**Paso 3: Verificar**
- Deberías ver ~30 tablas creadas
- Ve a **Table Editor** para confirmar

### Archivos SQL disponibles

| Archivo | Uso |
|---------|-----|
| `easypanel/init-scripts/full-schema.sql` | Schema completo con RLS, triggers, datos iniciales |
| `easypanel/init-scripts/postgres-external-schema.sql` | Solo para PostgreSQL externo sin Supabase |

## 🔧 Variables de Entorno

### Para desarrollo local

```bash
# .env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...tu_anon_key
```

### Para Easypanel (Build Args en Dockerfile)

Las variables se configuran directamente en Easypanel → Environment:

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase |

## 📁 Estructura del Proyecto

```
├── src/
│   ├── components/     # Componentes React
│   ├── hooks/          # Custom hooks (useClients, useInvoices, etc.)
│   ├── pages/          # Páginas de la app
│   └── integrations/   # Cliente Supabase
├── supabase/
│   └── functions/      # Edge Functions
├── easypanel/
│   ├── README.md       # Guía de despliegue Easypanel
│   └── init-scripts/   # SQL para inicializar la DB
└── docs/
    └── MIGRATION_HYBRID_ARCHITECTURE.md  # Arquitectura híbrida
```

## 🛠️ Desarrollo Local

```bash
# Clonar repositorio
git clone <repo-url>
cd <project>

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 📚 Documentación Adicional

- [Guía de Despliegue en Easypanel](./easypanel/README.md)
- [Arquitectura Híbrida PostgreSQL + Supabase](./docs/MIGRATION_HYBRID_ARCHITECTURE.md)

## 📧 Configuración de Correo Electrónico

### Opción 1: Gmail SMTP con App Password (Recomendado)

La forma más sencilla de enviar emails con Gmail:

1. **Habilitar verificación en 2 pasos** en tu cuenta de Google
2. **Generar App Password**:
   - Ve a [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Copia la contraseña de 16 caracteres generada

3. **Configuración SMTP** en el CRM:
   | Campo | Valor |
   |-------|-------|
   | Host SMTP | `smtp.gmail.com` |
   | Puerto | `587` (TLS) o `465` (SSL) |
   | Usuario | tu-email@gmail.com |
   | Contraseña | La App Password generada |
   | Conexión segura | ✅ Activada |

### Opción 2: SMTP Genérico

Puedes usar cualquier proveedor SMTP (SendGrid, Mailgun, tu propio servidor):

| Campo | Descripción |
|-------|-------------|
| Host SMTP | Servidor SMTP de tu proveedor |
| Puerto | Generalmente 587 (TLS) o 465 (SSL) |
| Usuario | Tu usuario SMTP |
| Contraseña | Tu contraseña SMTP |

### Opción 3: Resend (Alternativa moderna)

1. Crea cuenta en [https://resend.com](https://resend.com) (100 emails/día gratis)
2. Genera una API Key
3. Verifica tu dominio (opcional, para enviar desde tu dominio)

---

## 🔐 Configuración de Google Calendar

Para la integración con Google Calendar, configura la URL de callback en Google Cloud Console:

| Integración | URL de Callback |
|-------------|-----------------|
| **Google Calendar** | `https://honfwrfkiukckyoelsdm.supabase.co/functions/v1/google-calendar-callback` |

**Pasos:**
1. Ve a [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials)
2. Edita tu cliente OAuth 2.0
3. En "URIs de redirección autorizados", añade la URL de arriba
4. En "Pantalla de consentimiento OAuth", añade tu email como usuario de prueba si está en modo Testing

## 🔒 Seguridad

- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Autenticación via Supabase Auth
- ✅ Roles: `admin`, `manager`, `user`
- ✅ Políticas de acceso por rol

## 📝 Funcionalidades

- **Clientes**: Gestión completa de clientes y contactos
- **Presupuestos**: Creación y seguimiento de quotes
- **Contratos**: Gestión de contratos recurrentes
- **Facturas**: Facturación con soporte para remesas bancarias
- **Gastos**: Control de gastos con IVA/IRPF
- **Calendario**: Eventos con integración Google Calendar
- **Dashboard**: Widgets personalizables con métricas
- **Campañas**: Gestión de campañas de marketing
- **Notificaciones**: Sistema de notificaciones por email

## 🤝 Tecnologías

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Base de datos**: PostgreSQL con pgvector para RAG
