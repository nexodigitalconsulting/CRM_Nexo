# 🗺️ ROADMAP CRM - Plan de Desarrollo

## Estado Actual del Proyecto

### ✅ Completado
- [x] Autenticación con Supabase
- [x] Base de datos completa con tablas y RLS
- [x] CRUD Clientes (crear, editar, eliminar, listar)
- [x] CRUD Contactos (+ conversión a cliente)
- [x] CRUD Servicios
- [x] UI de todas las páginas principales

### 🔄 En Progreso
- [ ] CRUD Presupuestos
- [ ] CRUD Contratos
- [ ] CRUD Facturas

---

## FASE 1: Funcionalidad CRUD Básica ⏱️ Semana 1

### 1.1 Presupuestos (Quotes)
- [ ] Hook `useQuotes.tsx`
- [ ] Formulario de creación/edición
- [ ] Selector de servicios con cantidades
- [ ] Cálculo automático de totales
- [ ] Cambio de estado (Borrador → Enviado → Aprobado/Rechazado)

### 1.2 Contratos (Contracts)
- [ ] Hook `useContracts.tsx`
- [ ] Formulario de creación desde presupuesto
- [ ] Configuración de facturación recurrente
- [ ] Gestión de servicios incluidos

### 1.3 Facturas (Invoices)
- [ ] Hook `useInvoices.tsx`
- [ ] **Series de facturación** (nuevo campo en BD)
- [ ] Generación desde contrato
- [ ] Cambio de estados
- [ ] Vinculación a remesas

---

## FASE 2: Diseñador de Informes ⏱️ Semana 2

### 2.1 Arquitectura
```
src/
├── components/reports/
│   ├── ReportDesigner.tsx      # Editor principal
│   ├── VariablePicker.tsx      # Lista de variables
│   ├── ReportPreview.tsx       # Vista previa
│   └── ReportTemplateList.tsx  # Lista de plantillas
├── hooks/
│   └── useReportTemplates.tsx  # CRUD plantillas
└── lib/
    └── pdf-generator.ts        # Generación PDF
```

### 2.2 Variables Disponibles por Entidad

**Factura:**
- `{{invoice.number}}` - Número de factura
- `{{invoice.series}}` - Serie
- `{{invoice.date}}` - Fecha emisión
- `{{invoice.due_date}}` - Fecha vencimiento
- `{{invoice.subtotal}}` - Base imponible
- `{{invoice.iva}}` - IVA
- `{{invoice.total}}` - Total
- `{{client.name}}` - Nombre cliente
- `{{client.cif}}` - CIF
- `{{client.address}}` - Dirección completa
- `{{services}}` - Lista de servicios

**Presupuesto:**
- `{{quote.number}}` - Número presupuesto
- `{{quote.valid_until}}` - Validez
- (+ mismos campos cliente y servicios)

**Contrato:**
- `{{contract.number}}` - Número contrato
- `{{contract.start_date}}` - Fecha inicio
- `{{contract.end_date}}` - Fecha fin
- `{{contract.billing_period}}` - Periodicidad
- (+ mismos campos cliente y servicios)

### 2.3 Base de Datos
```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'invoice', 'quote', 'contract'
  content JSONB NOT NULL,    -- Configuración del diseño
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## FASE 3: Pagos y Remesas ⏱️ Semana 2-3 ✅ COMPLETADO

### 3.1 Series de Facturación
- [ ] Migración: añadir campo `series` a invoices
- [ ] Configuración de series en Settings
- [ ] Formato: `{SERIE}-{AÑO}-{NUMERO}` (ej: FF-2024-0001)

### 3.2 Generador de Remesas SEPA ✅
- [x] Crear remesa desde facturas seleccionadas
- [x] Generar XML ISO 20022 (pain.008) - `src/lib/sepa/sepaXmlGenerator.ts`
- [x] Descargar ficheros XML SEPA
- [x] Editar remesa (código, fecha cobro, notas)
- [x] Añadir/quitar facturas de remesa existente
- [x] Flujo de estados: Pendiente → Enviada → Cobrada/Parcial/Devuelta → Anulada
- [x] Registrar pagos y devoluciones individuales
- [x] Historial de pagos por remesa
- [x] Exportar facturas a Excel
- [x] Tabla de `remittance_payments` para tracking
- [x] Campos SEPA en clientes (BIC, mandato, fecha, tipo secuencia)
- [x] Identificador de Acreedor SEPA en company_settings

### 3.3 Sistema de Domiciliación
- [ ] Flujo automático para facturas recurrentes
- [ ] Edge function para generar domiciliaciones
- [ ] Scheduler (cron) mensual
- [ ] Notificaciones de estado

---

## FASE 4: Integraciones ⏱️ Semana 3

### 4.1 Google Calendar
**Requisitos:**
- Client ID de Google Cloud Console
- Scope: `calendar.events`

**Funcionalidades:**
- [ ] OAuth2 flow para conectar cuenta
- [ ] Sincronizar reuniones de contactos
- [ ] Sincronizar vencimientos de facturas
- [ ] Sincronizar próximas facturaciones
- [ ] Bidireccional: eventos creados en CRM → Calendar

### 4.2 n8n Webhooks
- [ ] Endpoint para recibir eventos de n8n
- [ ] Configuración de workflows en Settings
- [ ] Triggers disponibles:
  - Nuevo contacto
  - Factura emitida
  - Factura vencida
  - Contrato próximo a renovar

---

## FASE 5: Mejoras Adicionales ⏱️ Futuro

### 5.1 Dashboard Dinámico
- [ ] Widgets configurables
- [ ] Datos reales de BD
- [ ] Gráficos de facturación
- [ ] Pipeline de contactos

### 5.2 Automatizaciones Avanzadas
- [ ] Reglas personalizadas (IF-THEN)
- [ ] Emails automáticos
- [ ] Recordatorios programados
- [ ] Notificaciones push

### 5.3 Exportaciones
- [ ] Excel/CSV de cualquier tabla
- [ ] Backup completo
- [ ] Integración contable

---

## Prioridades Técnicas

1. **Seguridad**: RLS en todas las tablas ✅
2. **Performance**: Índices en campos de búsqueda
3. **UX**: Loading states, optimistic updates
4. **Mantenibilidad**: Hooks reutilizables, componentes pequeños

---

## Siguiente Paso Recomendado

👉 **Implementar CRUD de Presupuestos** con:
- Selector de cliente/contacto
- Añadir servicios con cantidades
- Cálculo automático de totales
- Estados y transiciones

¿Procedemos con los presupuestos?
