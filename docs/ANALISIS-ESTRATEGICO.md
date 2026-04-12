# ANÁLISIS ESTRATÉGICO — CRM Suite v2.0
**Fecha:** Abril 2026
**Objetivo:** Tomar decisiones de negocio con datos concretos sobre infraestructura, rentabilidad y escalabilidad

---

## RESUMEN EJECUTIVO

> **Stack v2 definitivamente decidido** (Abril 2026): PostgreSQL directo + Better Auth + Cloudflare R2 + Easypanel. Se elimina toda dependencia de Supabase self-hosted.

| Decisión | Confirmado |
|----------|-----------|
| Stack backend | **PostgreSQL 15 + Drizzle ORM + Better Auth** — sin Supabase de ningún tipo |
| Server-side logic | **Next.js API Routes** — sin Edge Functions Deno |
| Storage | **Cloudflare R2** — credenciales por cliente, 0 RAM en VPS |
| Orquestación deploy | **Easypanel** — sin cambios (ya integrado con n8n y otras herramientas) |
| RAM por cliente | **350–600 MB** (vs 960 MB–1.4 GB actual) — ahorro ~600 MB |
| VPS recomendado | Hostinger KVM 1 (4 GB, ~€5/mes) para 2–3 clientes |
| Modelo de negocio | **Instancia dedicada** hasta 5 clientes; multi-tenant a partir de 6+ |
| Sistema de réplica | **Script bash automatizado** (`new-client.sh`) — 30–45 min por cliente |
| Precio mínimo viable | **€79/mes** (single-tenant) o **€39/mes** (multi-tenant desde 10 clientes) |

---

## 1. EFICIENCIA Y RECURSOS VPS

### 1.1 Comparativa de consumo RAM: v1 vs v2 definitivo

#### v1 (Supabase self-hosted) — por cliente

| Contenedor | Imagen | RAM en reposo | RAM bajo carga |
|-----------|--------|--------------|----------------|
| `supabase-db` | postgres:15 | 150–250 MB | 300–600 MB |
| `supabase-auth` | supabase/gotrue | 80–120 MB | 120–180 MB |
| `supabase-rest` | postgrest/postgrest | 50–80 MB | 80–150 MB |
| `supabase-realtime` | supabase/realtime | 100–200 MB | 200–400 MB |
| `supabase-storage` | supabase/storage-api | 60–100 MB | 100–200 MB |
| `supabase-functions` | supabase/edge-runtime (Deno) | 200–400 MB | 400–800 MB |
| `supabase-studio` | supabase/studio | 200–350 MB | 250–400 MB |
| `supabase-meta` | supabase/postgres-meta | 40–60 MB | 60–80 MB |
| `supabase-kong` | kong | 80–120 MB | 100–200 MB |
| CRM Web (Nginx) | nginx:alpine | 20–50 MB | 20–50 MB |
| **TOTAL v1** | | **980 MB – 1.73 GB** | **1.6 – 3.0 GB** |

**Implicación v1:** Un KVM 1 (4 GB) es insuficiente. Se necesita mínimo KVM 2 (8 GB) por cliente.

#### v2 definitivo (PostgreSQL + Next.js + Better Auth) — por cliente

| Contenedor | Imagen | RAM en reposo | RAM bajo carga |
|-----------|--------|--------------|----------------|
| `postgres` | postgres:15-alpine | 150–250 MB | 250–500 MB |
| `crm-app` | node:20-alpine (Next.js + Better Auth) | 200–350 MB | 350–700 MB |
| Cloudflare R2 | — (externo, 0 RAM en VPS) | **0 MB** | **0 MB** |
| **TOTAL v2** | | **350–600 MB** | **600 MB – 1.2 GB** |

**Implicación v2:** Un KVM 1 (4 GB) puede alojar **2–3 clientes** cómodamente. Un KVM 2 (8 GB) puede alojar **4–6 clientes**.

---

### 1.2 Tabla comparativa de alternativas

| Stack | RAM mínima | RAM típica | CPU idle | Coste/mes VPS | Complejidad réplica | Compatibilidad con código actual |
|-------|-----------|-----------|---------|---------------|--------------------|---------------------------------|
| **Supabase self-hosted (actual)** | 960 MB | 1.4 GB | Media | €10–12 (KVM 2) | Media (Easypanel template) | ✅ Total |
| **Supabase self-hosted (optimizado)** | 600 MB | 900 MB | Media | €8–10 (KVM 2 compartido) | Media | ✅ Total |
| **PocketBase** | 30–80 MB | 50–120 MB | Baja | €4–5 (KVM 1) | Baja (1 binario) | ❌ Reescritura completa |
| **PostgreSQL puro + Better Auth + R2** | 150–300 MB | 300–500 MB | Baja | €5–7 (KVM 1) | Media | ⚠️ Migración parcial |
| **Neon Postgres (serverless) + Better Auth** | 0 MB (BD remota) | 100–200 MB | Muy baja | €0–19 (Neon) + €4 (VPS min) | Baja | ⚠️ Migración de queries |
| **Directus self-hosted** | 350–600 MB | 500–900 MB | Media | €8–10 (KVM 2) | Media | ❌ Reescritura completa |
| **Turso (SQLite distribuido)** | 0 MB (BD remota) | 50–100 MB | Muy baja | €0–9 (Turso) + €4 (VPS min) | Baja | ❌ Sin PostgreSQL features |
| **Multi-tenant (N clientes / 1 VPS)** | 1 GB total | 1.5–3 GB | Media | €18–20 (KVM 4) / N clientes | Muy baja por cliente | ✅ Con refactor |

---

### 1.3 Análisis por alternativa

#### PocketBase — ¿Por qué NO?

PocketBase es elegante pero requiere **reescribir el 100% de las integraciones**:
- El código actual tiene 25+ hooks con `supabase.from('tabla').select()` — APIs totalmente incompatibles con PocketBase SDK
- No tiene PostgreSQL real: no puede ejecutar las queries complejas SEPA, los ENUMs de estado en español, ni pgvector
- SQLite no escala bien con múltiples writers concurrentes (facturas, emails, webhooks n8n simultáneos)
- **Estimación de migración:** 15–25 días de desarrollo para portar todos los módulos

#### Neon Postgres — La opción más interesante para v2

Neon es PostgreSQL serverless: el mismo SQL, mismas extensiones (pgvector, uuid-ossp), mismas queries. La migración es **transparente a nivel de código** — solo cambia el `DATABASE_URL`.

```
Neon Free Tier:
  - 0.5 GB storage, 1 proyecto, 10 ramas (dev/staging/prod)
  - Compute: 0.25 vCPU / 1 GB RAM (serverless, solo cuando hay queries)
  - Precio: €0/mes

Neon Pro (por cliente):
  - 10 GB storage, sin límite de proyectos
  - Auto-scaling: 0–4 vCPU
  - Precio: ~€19/mes por workspace (cubre varios proyectos)

Neon Scale (multi-tenant):
  - Un proyecto por tenant (con branching)
  - ~€69/mes para 50 proyectos activos
```

**Ventaja clave para este producto:** En multi-tenant, cada cliente tiene su propia **rama Neon** (branch) = aislamiento de datos perfecto + backup automático + 0 RAM en el VPS para la BD.

#### PostgreSQL puro + Better Auth + Cloudflare R2 — La opción de control total

```
Por cliente, en VPS:
  postgresql:15-alpine:    150–250 MB RAM
  Better Auth (en Next.js): +50–80 MB (corre en el proceso Node)
  CRM Next.js:             150–300 MB

  Total: 350–600 MB RAM por cliente
  Cloudflare R2: 10 GB gratis/mes, $0.015/GB adicional — 0 RAM en VPS

VPS necesario: KVM 1 (4 GB) puede alojar 2–3 clientes
Coste infra: €4–6/mes × 2–3 clientes = €1.5–3/mes por cliente
```

Esta opción elimina Supabase completamente pero requiere:
- Implementar auth propia con Better Auth (~3 días de setup)
- Migrar `supabase.auth.*` calls a Better Auth SDK (~2 días)
- Las queries de datos (`supabase.from(...)`) siguen igual vía PostgREST o directo

#### Supabase self-hosted optimizado — El camino mínimo de riesgo

Deshabilitar los servicios que este CRM **no usa**:
- **Studio** en producción: ahorra 200–350 MB (el cliente no necesita acceder a Supabase Studio)
- **Realtime**: el CRM actual no usa suscripciones en tiempo real — ahorra 100–200 MB
- **Storage**: las facturas PDF se generan en cliente — si no se usan attachments, ahorra 60–100 MB

```
Supabase self-hosted mínimo (solo Auth + PostgreSQL + PostgREST + Edge Functions):
  postgresql:      200 MB
  gotrue:          100 MB
  postgrest:        60 MB
  edge-runtime:    250 MB (necesario para send-email, Google Calendar)

  Total: ~610 MB RAM
```

Con este perfil, un VPS de 4 GB puede alojar **2 clientes** + headroom.

---

### 1.4 Stack definitivo por fase

> El stack v2 (PostgreSQL + Next.js + Better Auth + R2) es el mismo en todas las fases. Lo que cambia es el modelo de tenancy y el tamaño del VPS.

```
FASE ACTUAL (0–5 clientes): instancias dedicadas
  Stack: PostgreSQL 15 + Next.js + Better Auth + Cloudflare R2
  VPS: Hostinger KVM 1 (4 GB) para 2 clientes, o KVM 2 (8 GB) para 4 clientes
  Coste: ~€3–6/mes por cliente de infra (vs €11/mes en v1)
  Migración desde v1: ~12 días de desarrollo (Fases M1–M4 del roadmap)
  Réplica: script new-client.sh (~30 min por cliente)

FASE CRECIMIENTO (5–15 clientes): instancias dedicadas en VPS compartidos
  Stack: mismo
  VPS: KVM 2 (8 GB) compartido entre 4–5 clientes
  Coste: ~€2–3/mes por cliente de infra
  Sin cambios de código respecto a la fase anterior

FASE ESCALA (15+ clientes): multi-tenant real
  Stack: mismo (Next.js + Better Auth organizations + Drizzle con org_id)
  VPS: 1 KVM 4 (16 GB) para todos los clientes
  Coste: <€2/mes por cliente de infra
  Requiere: Fase 3 del roadmap (~8 días) — añadir org_id a tablas + provisioning script
```

> La ventaja del stack v2 es que **no hay un "salto de stack"** entre fases. El mismo código base escala desde 1 cliente hasta 50+. Solo cambia si los datos de múltiples clientes están en instancias separadas o en la misma BD con `org_id`.

---

## 2. ANÁLISIS DE RENTABILIDAD

### 2.1 Costes de infraestructura por cliente

#### Modelo A: Instancia dedicada por cliente (v2 stack)

| Componente | Proveedor | Coste/mes |
|-----------|----------|-----------|
| VPS Hostinger KVM 1 (1 vCPU / 4 GB / 50 GB NVMe) **compartido 2 clientes** | Hostinger | ~€2.50–3/cliente |
| O bien: KVM 2 (2 vCPU / 8 GB) compartido 4 clientes | Hostinger | ~€2.75/cliente |
| Dominio `.com` amortizado | Namecheap/Cloudflare | €0.83 |
| SSL | Incluido en Easypanel (Let's Encrypt) | €0 |
| Cloudflare R2 (hasta 10 GB/mes gratis) | Cloudflare | €0–2 |
| Backup VPS (snapshots Hostinger) | Hostinger | €0.50–1 |
| Email transaccional (Brevo free 9.000 emails/mes) | Brevo | €0 |
| **Total infra por cliente (v2)** | | **€3.30–7/mes** |

**vs v1:** El mismo cliente en v1 costaba €12.32–16.32/mes (necesitaba KVM 2 entero por el peso de Supabase).
**Ahorro v2 vs v1:** ~€8–10/mes por cliente = **€96–120/año** de reducción de costes de infra.

> Con el stack v2, un KVM 2 (8 GB, €10.99/mes) puede alojar **4 clientes**, bajando el coste de infra a €2.75/mes por cliente.

#### Modelo B: Multi-tenant (varios clientes / 1 VPS)

| Componente | Coste/mes total | A 5 clientes | A 10 clientes | A 20 clientes |
|-----------|----------------|-------------|--------------|--------------|
| VPS KVM 4 (4 vCPU / 16 GB) | €18.99 | €3.80 | €1.90 | €0.95 |
| Neon Pro (BD por tenant) | €19.00 | €3.80 | €1.90 | €0.95 |
| Cloudflare R2 storage | €0–5 | €0–1 | €0–0.5 | €0–0.25 |
| Email (Brevo: 9000 emails/mes gratis) | €0 | €0 | €0 | €0 |
| **Total infra/cliente** | | **€7.60–8.60** | **€3.80–4.30** | **€1.90–2.15** |

---

### 2.2 Costes operativos (tiempo)

| Actividad | Tiempo actual | Tiempo optimizado | Coste (€35/hora) |
|-----------|-------------|-----------------|-----------------|
| Setup inicial nuevo cliente (single-tenant) | 3–4 horas | 1–2 horas (script bash) | €35–70 |
| Mantenimiento mensual (actualizaciones) | 1–2 horas/mes | 0.5–1 hora | €17.50–35/mes |
| Soporte técnico cliente | 1–3 horas/mes | 1–2 horas/mes | €35–70/mes |
| Desarrollo nuevas features | Amortizable N clientes | — | — |

> La palanca de rentabilidad más importante es **reducir el tiempo de setup** de 3–4 horas a 1 hora mediante automatización.

---

### 2.3 Precio mínimo viable (PMV)

#### Single-tenant:

```
Costes fijos mensuales por cliente:
  Infra VPS:            €12–16
  Setup amortizado:     €35–70 setup / 12 meses = €3–6/mes
  Mantenimiento:        €17–35/mes
  Soporte:              €35–70/mes
  ─────────────────────────────────
  Total costes:         €67–127/mes

Margen del 30%:         €20–38/mes
Precio mínimo viable:   €87–165/mes
Precio recomendado:     €99–149/mes
```

#### Multi-tenant (a partir de 5 clientes):

```
Costes fijos mensuales por cliente:
  Infra:                €4–8
  Setup amortizado:     €35 setup / 12 meses = €3/mes
  Mantenimiento:        €5–10/mes (economías de escala)
  Soporte:              €20–35/mes
  ─────────────────────────────────
  Total costes:         €32–56/mes

Margen del 40%:         €13–22/mes
Precio mínimo viable:   €45–78/mes
Precio recomendado:     €59–89/mes
```

---

### 2.4 Modelos de pricing recomendados

#### Opción 1: Tier único — Simple y honesto
```
Precio: €99/mes por cliente
Incluye: instancia dedicada, soporte básico, actualizaciones
Setup: €299 (one-time)
```

#### Opción 2: Tiers por uso — Maximiza conversión
```
Starter:    €49/mes  → Módulos básicos (CRM, Facturas, Contratos)
            Hasta 3 usuarios, 500 clientes en BD
            Multi-tenant compartido

Pro:        €99/mes  → Todos los módulos + SEPA + Google Calendar
            Hasta 10 usuarios, usuarios ilimitados en BD
            Instancia dedicada opcional

Enterprise: €199/mes → Instancia dedicada, personalización de marca completa,
            SLA, backups diarios, soporte prioritario
```

#### Opción 3: Precio por implantación + mantenimiento bajo
```
Setup/implantación: €800–1.500 (one-time, incluye configuración + formación)
Mantenimiento: €29/mes (hosting + actualizaciones automáticas)
Soporte adicional: €45/hora
```

> **Recomendación:** Opción 2 (tiers) + Opción 3 combinadas: **setup €500 + €49–99/mes según tier**. El setup cubre el tiempo de implantación; el mantenimiento cubre infra + actualizaciones.

---

### 2.5 Break-even y proyección

#### Single-tenant a €99/mes:

```
Inversión inicial (desarrollo hasta v1 funcionando): ~€8.000–15.000
  (o tiempo propio: 80–150 horas de desarrollo)

Punto de equilibrio considerando tiempo de desarrollo:
  A €99/mes y €12/mes de costes = €87/mes de margen neto por cliente
  Break-even (recuperar inversión de €10.000): 115 clientes × mes
  = 10 clientes × 12 meses = 1 año con 10 clientes

Break-even operativo (costes corrientes, sin recuperar inversión):
  Desde el primer cliente si el precio > €67/mes
```

| Clientes | Ingresos/mes | Costes infra+soporte | Margen bruto |
|----------|-------------|---------------------|-------------|
| 1 | €99 | €75 | €24 |
| 3 | €297 | €180 | €117 |
| 5 | €495 | €250 | €245 |
| 10 | €990 | €420 | €570 |
| 20 | €1.980 | €700 | €1.280 |

#### Multi-tenant a €59/mes (desde cliente 6):

| Clientes | Ingresos/mes | Costes infra+soporte | Margen bruto |
|----------|-------------|---------------------|-------------|
| 5 | €295 | €180 | €115 |
| 10 | €590 | €230 | €360 |
| 20 | €1.180 | €310 | €870 |
| 50 | €2.950 | €550 | €2.400 |

> La escalabilidad del modelo multi-tenant se vuelve muy rentable a partir de 15–20 clientes.

---

### 2.6 Tiempo de réplica — Impacto en rentabilidad

El tiempo de setup impacta directamente en cuánto cuesta adquirir un cliente:

| Sistema | Tiempo de réplica | Coste (€35/hora) | ROI si cobra €299 setup |
|---------|-----------------|-----------------|------------------------|
| Sistema actual (manual, Easypanel GUI) | 3–4 horas | €105–140 | €159–194 de margen |
| Script bash semi-automatizado | 1–1.5 horas | €35–52 | €247–264 de margen |
| Multi-tenant script completo | 15–30 min | €9–17 | €282–290 de margen |
| Coolify one-click template | 30–60 min | €17–35 | €264–282 de margen |

> Automatizar el deploy de 4 horas a 30 minutos **ahorra €90–125 por cliente nuevo**.

---

## 3. SISTEMA DE RÉPLICA — COMPARATIVA

### 3.1 Matriz de decisión

| Sistema | Tiempo réplica | Coste setup | Control | Facilidad ops | Escalabilidad | Recomendado |
|---------|---------------|------------|---------|--------------|--------------|------------|
| **A: Actual (GitHub + Easypanel + manual)** | 3–4 horas | €0 | Alto | Media | Baja | Para 1–3 clientes |
| **B: Script bash automatizado (mejorado)** | 45–90 min | €0 | Alto | Alta | Media | ✅ Para 3–10 clientes |
| **C: Coolify self-hosted** | 2–3 horas | €0 (open-source) | Alto | Media | Media | No (más pesado) |
| **D: Multi-tenant (1 VPS, N clientes)** | 10–20 min | €0 | Alto | Muy alta | Alta | ✅ Para 10+ clientes |
| **E: Render/Railway templates** | 20–40 min | €0 | Bajo | Muy alta | Media | Para demos/pruebas |
| **F: Script + Coolify API** | 30–60 min | €0 | Alto | Alta | Media | Alternativa a B |

---

### 3.2 Análisis detallado por sistema

#### Sistema A: Actual (GitHub + Easypanel + manual)

**Cómo funciona:**
1. Crear proyecto en Easypanel → template Supabase (~5 min, manual)
2. Ejecutar `full-schema.sql` en Supabase Studio (~10 min, manual)
3. Crear servicio CRM en Easypanel → configurar Build Args + Env Vars + Mounts (~15 min, manual)
4. Trigger deploy, esperar build (~5 min)
5. Verificar Edge Functions en startup logs (~5 min)
6. Crear usuario admin + configurar empresa (~10 min)
7. Total: **50–60 min** (con práctica) o **3–4 horas** (primera vez)

**Problemas:**
- Muchos pasos manuales propensos a error
- No hay rollback automatizado
- Cada cliente requiere revisión de logs para confirmar que todo funciona
- No hay forma de actualizar todos los clientes a la vez

---

#### Sistema B: Script bash automatizado ✅ (RECOMENDADO a corto plazo)

**Propuesta:** Un script `new-client.sh` que automatice todos los pasos del Sistema A via APIs de Easypanel y comandos SSH:

```bash
# Uso:
./easypanel/scripts/new-client.sh \
  --project empresa-abc \
  --domain empresa-abc.com \
  --admin-email admin@empresa-abc.com \
  --vps-host 123.123.123.123

# Lo que hace el script (~45 minutos total):
# 1. Crea proyecto en Easypanel via API (2 min)
# 2. Despliega template Supabase via API (8 min)
# 3. Espera a que PostgreSQL esté ready
# 4. Ejecuta full-schema.sql via psql (2 min)
# 5. Crea servicio CRM con todas las variables vía API (2 min)
# 6. Trigger build + espera (5 min)
# 7. Verifica Edge Functions + ping (1 min)
# 8. Crea usuario admin via Edge Function bootstrap-admin (1 min)
# 9. Genera .env del cliente y guarda en vault
# Tiempo humano activo: ~10 min (supervisión)
# Tiempo total: ~25–35 min (90% automatizado)
```

**Ventajas:**
- Reproducible y auditable
- Compatible con sistema actual sin cambios de arquitectura
- Genera `.env` del cliente automáticamente
- Puede ejecutarse desde CI/CD o localmente
- Sin coste adicional de infraestructura

---

#### Sistema C: Coolify self-hosted

Coolify es open-source y similar a Easypanel pero con más features:
- Git webhooks automáticos
- Docker Swarm / compose nativo
- Templates de un clic
- API completa

**Problema:** Coolify mismo necesita **2 GB de RAM** para correr correctamente. En un VPS de 8 GB por cliente, esto deja solo 6 GB para Supabase + CRM — viable pero ajustado.

**Ventaja sobre Easypanel:** La API de Coolify está mejor documentada, lo que facilitaría el script automatizado del Sistema B.

**Recomendación:** No vale la pena migrar de Easypanel a Coolify por ahora. El coste de migración supera el beneficio a esta escala.

---

#### Sistema D: Multi-tenant real (1 VPS / N clientes) ✅ (RECOMENDADO a largo plazo)

**Cómo funciona:**
```
1 VPS KVM 4 (16 GB, €18.99/mes) contiene:
  ├── 1 instancia Next.js (CRM app)
  ├── 1 PostgreSQL con N schemas (1 por cliente)
  └── 1 Supabase Auth (GoTrue) compartido
         ↑ Cada cliente tiene su propio JWT claim org_id
         ↑ RLS garantiza aislamiento de datos

Para añadir nuevo cliente:
  1. Crear registro en tabla organizations
  2. Crear schema PostgreSQL: CREATE SCHEMA client_empresa_abc
  3. Ejecutar schema inicial en ese schema
  4. Crear usuario admin con org_id
  → Tiempo: 5–10 minutos (script)
```

**Costes a escala:**
```
10 clientes a €59/mes = €590/mes ingresos
  VPS KVM 4:  €19/mes
  Neon Pro:   €19/mes (BD)
  ─────────────────
  Total:      €38/mes de infra (6.5% de ingresos)
  Margen:     €552/mes bruto antes de soporte
```

**Requerimientos técnicos:** Implementar Fase 3 del roadmap (multi-tenant) = ~10 días de desarrollo.

---

#### Sistema E: Render/Railway templates

**Render.com:**
```
- Deploy en 1 clic desde template de GitHub
- PostgreSQL gestionado incluido
- HTTPS automático
- Precio: ~$25–85/mes por instancia (depending on dyno size)
- Sin control de infraestructura
- Restart delays ("cold starts" en free tier)
```

**Railway.app:**
```
- Muy similar a Render
- Precio: ~$5–20/mes por servicio + BD separada
- Mejor para prototipos y demos
- Sin gestión de Edge Functions
```

**Problema para este producto:** Las Edge Functions Deno de Supabase no funcionan en Render/Railway. Habría que migrar toda la lógica server-side a API Routes de Next.js.

**Recomendación:** Útil para **demos de venta** (desplegar instancia de demo en minutos), no para producción por cliente.

---

## 4. MEJORAS AL PRODUCTO FINAL

### 4.1 Problemas UX que reducen la percepción de valor

| Problema | Impacto en ventas | Esfuerzo de fix |
|---------|-----------------|----------------|
| **Flows.tsx tiene datos hardcodeados** — la página de "Flujos n8n" muestra datos ficticios, no conecta realmente con n8n | Alto (promesa de integración vacía) | Medio (3–5 días) |
| **Bundle JS sin code splitting** — primera carga lenta | Medio (percepción de lentitud) | Bajo (1 día config Vite) |
| **MigrationGate bloquea al usuario** — si hay delay en la red, el spinner aparece 8+ segundos antes de dejar entrar | Alto (primera impresión mala) | Bajo (1 día) |
| **No hay onboarding** — primera vez en el CRM, el usuario no sabe qué hacer | Alto (retención baja) | Medio (2–3 días) |
| **Dashboard con widgets vacíos** en instalaciones nuevas | Medio | Bajo (1 día, añadir empty states) |

### 4.2 Módulos que faltan y tienen valor comercial alto

| Módulo | Valor para el cliente | Esfuerzo | Ingresos potenciales |
|--------|---------------------|---------|---------------------|
| **Firma digital de contratos** (DocuSign-like via email) | Muy alto — elimina imprimir/escanear | Alto (5–8 días) | +€15–20/mes por cliente |
| **Portal del cliente** (ver facturas/contratos pendientes) | Alto — reduce soporte | Medio (4–6 días) | +€10/mes o feature de tier superior |
| **Conexión n8n real** (workflows desde el CRM, no ficticios) | Alto — automatización diferenciadora | Medio (3–5 días) | Módulo Pro |
| **Recurring invoices automáticas** desde contratos | Alto — ahorra tiempo mensual | Medio (3–4 días) | Incluido en Pro |
| **App móvil (PWA)** — acceso desde móvil | Medio | Bajo (1 día habilitar PWA) | Reduce fricción |
| **Exportación contable** (A3/Sage/Holded format) | Alto para contables | Medio (3–5 días) | +€10/mes o addon |

### 4.3 Integraciones de alto valor

| Integración | Dificultad | Impacto en precio |
|------------|-----------|-----------------|
| **WhatsApp Business API** (notificaciones de facturas) | Media | +€15/mes |
| **Stripe/TPV** (cobros online desde factura) | Alta | +€20/mes o % de transacción |
| **Holded / Sage API** (sincronización contabilidad) | Media | Segmento SMB premium |
| **Booking/citas** (para clientes de servicios) | Media | Amplía verticals |
| **Análisis de rentabilidad por cliente/servicio** | Baja (datos ya están) | Diferenciador analítico |

### 4.4 Mejoras técnicas que impactan directamente en ventas

#### Code splitting — 1 día de trabajo, impacto visible

```typescript
// vite.config.ts — añadir code splitting manual
rollupOptions: {
  output: {
    manualChunks: {
      'pdf': ['pdf-lib', 'fabric'],           // ~800 KB — solo en /settings
      'charts': ['recharts'],                  // ~400 KB — solo en /dashboard
      'grid': ['react-grid-layout'],           // ~200 KB — solo en /dashboard
      'sepa': ['./src/lib/sepa'],              // ~50 KB — solo en /remittances
    }
  }
}
```
Resultado estimado: reducir bundle inicial de ~2.5 MB a ~800 KB = **carga inicial 3× más rápida**.

#### MigrationGate — Reducir fricción en primer uso

```typescript
// Reducir timeout de 8s a 3s para entornos self-hosted
// Si falla, entrar al CRM directamente con banner de aviso
// No bloquear nunca el acceso completo
```

#### Notificaciones en tiempo real — Diferenciador

El stack actual tiene `notification_queue` en BD pero sin UI de notificaciones push. Implementar un simple polling de 30 segundos (no Realtime complejo) que muestre badge con notificaciones pendientes tiene **alto impacto percibido** con bajo esfuerzo técnico.

---

## 5. DECISIONES ESTRATÉGICAS RECOMENDADAS

### Decisión 1: Stack técnico — Confirmado

```
STACK DEFINITIVO (todas las fases):
  ✅ PostgreSQL 15 directo (postgres:15-alpine) — sin Supabase
  ✅ Next.js 14 App Router — reemplaza Vite SPA
  ✅ Better Auth — reemplaza Supabase GoTrue
  ✅ Drizzle ORM — reemplaza @supabase/supabase-js + PostgREST
  ✅ Next.js API Routes — reemplaza Edge Functions Deno
  ✅ Cloudflare R2 — reemplaza Supabase Storage
  ✅ Easypanel — sin cambios (ya integrado con n8n)

AHORA (0–3 meses) — sobre v1 existente:
  ✅ Fix urgentes de deploy actual (Fases 0b, 0, 0c del roadmap)
  ✅ Script bash new-client.sh para clientes nuevos en v1

1–3 MESES — migración a v2:
  ✅ Fases 1 + M1 + M2 + M3 + M4 del roadmap (~12 días desarrollo)
  ✅ v2 en producción: 2 contenedores por cliente vs 10 en v1
  ✅ KVM 1 (4 GB) aloja 2 clientes → coste infra: ~€2.75/cliente/mes

3–6 MESES (5+ clientes):
  ✅ Compartir VPS entre más clientes (KVM 2 para 4 clientes)
  ✅ Coste infra <€3/mes por cliente

6–18 MESES (10+ clientes):
  ✅ Multi-tenant real (Fase 3 del roadmap, ~8 días)
  ✅ 1 KVM 4 para todos los clientes
  ✅ Coste infra <€2/mes por cliente
  ✅ Precio competitivo €49–59/mes con margen del 40%+
```

### Decisión 2: Pricing inicial

```
Lanzamiento: setup €399 + €89/mes
(Incluye: instancia dedicada, todos los módulos, soporte básico)

Al superar 8 clientes: migrar nuevos a multi-tenant a €59/mes
(Mantener clientes existentes en su precio, no subir)

Objetivo año 1: 10 clientes × €89/mes = €890/mes
  - Costes infra: ~€150/mes (10 × €15 promedio)
  - Costes soporte: ~€200/mes
  - Margen bruto: ~€540/mes
```

### Decisión 3: Prioridad de producto

```
URGENTE (antes de captar nuevos clientes):
1. Flows.tsx: deshabilitar módulo o conectar a n8n real — 4h (deshabilitar) / 3 días (real)
2. Script new-client.sh: automatizar réplica v1 mientras se migra a v2 — 2 días
3. Code splitting Vite: pdf-lib + fabric a chunks separados — 1 día

DURANTE MIGRACIÓN A v2 (Fases M1–M4):
4. PDF server-side: mover pdf-lib del browser a API Route — incluido en M3
5. MigrationGate.tsx: ELIMINAR — ya no existe en v2
6. Timeout de 8s: ELIMINAR — ya no existe en v2

FEATURES DE ALTO VALOR (post-migración):
7. Firma digital de contratos — 8 días (+€15–20/mes por cliente)
8. Portal del cliente (read-only) — 5 días (+€10/mes o tier superior)
9. Conexión n8n real desde CRM — 5 días (módulo Pro diferenciador)
10. Recurring invoices automáticas — 3 días (ahorra trabajo mensual al cliente)
```

---

## APÉNDICE: Costes de referencia VPS Hostinger (Abril 2026)

| Plan | vCPU | RAM | Storage | Precio/mes | Clientes Supabase | Clientes multi-tenant |
|------|------|-----|---------|-----------|------------------|----------------------|
| KVM 1 | 1 | 4 GB | 50 GB NVMe | ~€4–6 | 0 (insuficiente) | 3–4 |
| KVM 2 | 2 | 8 GB | 100 GB NVMe | ~€10–12 | 1 (con margen) | 6–8 |
| KVM 4 | 4 | 16 GB | 200 GB NVMe | ~€18–20 | 2 (cómodo) | 12–16 |
| KVM 8 | 8 | 32 GB | 400 GB NVMe | ~€34–40 | 4–5 | 25–35 |

> Precios estimados. Hostinger tiene promociones frecuentes, verificar precios actuales en hostinger.com.
