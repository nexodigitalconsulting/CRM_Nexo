
# Plan: Revisión y Mejoras de la Tabla Servicios

## Resumen del Análisis

He realizado una revisión exhaustiva de la tabla `services`, sus conexiones y funcionalidades. A continuación se detallan los problemas encontrados y las mejoras propuestas.

---

## Problemas Identificados

### 1. Error en Schema: Columna Duplicada (CRÍTICO)

**Archivo**: `easypanel/init-scripts/full-schema.sql` líneas 339-340

```sql
payment_status payment_status DEFAULT 'pendiente',
payment_status payment_status DEFAULT 'pendiente',  -- DUPLICADO
```

**Impacto**: Este error impide crear la tabla `contracts` en nuevas instalaciones.

---

### 2. Foreign Keys sin ON DELETE RESTRICT explícito

**Problema**: Las FKs desde `quote_services`, `contract_services`, `invoice_services` hacia `services` usan el comportamiento por defecto (RESTRICT), pero la eliminación de un servicio en uso falla silenciosamente sin mensaje claro.

**Verificación actual**:
| Tabla | FK | ON DELETE |
|-------|------|-----------|
| quote_services | service_id | RESTRICT (default) |
| contract_services | service_id | RESTRICT (default) |
| invoice_services | service_id | RESTRICT (default) |
| invoice_products | service_id | NO ACTION |
| quote_products | service_id | NO ACTION |

**Servicios actualmente referenciados**:
- "RRSS": 1 factura, 1 presupuesto
- "Campañas": 1 factura, 2 presupuestos, 1 contrato

---

### 3. Triggers de updated_at NO EXISTEN en la BD

**Problema**: La consulta a `information_schema.triggers` devuelve vacío. Los triggers definidos en `full-schema.sql` no están aplicados.

**Impacto**: La columna `updated_at` no se actualiza automáticamente al editar servicios.

---

### 4. Faltan Índices de Rendimiento

**Problema**: Solo existe el índice primary key. Faltan índices para:
- Búsqueda por `service_id` en tablas relacionadas
- Búsqueda por `category` en services
- Búsqueda por `status` en services

---

### 5. Falta campo `created_by` en Services

**Problema**: A diferencia de otras tablas del CRM (invoices, quotes, contracts), `services` no tiene campo `created_by` para tracking de quién creó el servicio.

---

### 6. Eliminación de Servicios en Uso sin Validación UI

**Problema**: En `src/pages/Services.tsx`, la función `confirmDelete` no verifica si el servicio está siendo usado en facturas, presupuestos o contratos antes de intentar eliminarlo.

```typescript
const confirmDelete = async () => {
  if (serviceToDelete) {
    await deleteService.mutateAsync(serviceToDelete.id);  // Sin verificación
    ...
  }
};
```

**Resultado**: Error de BD al intentar eliminar servicio referenciado.

---

### 7. Duplicación de Servicio con ID vacío (Bug menor)

**Código en líneas 205-208**:
```typescript
setSelectedService({ ...service, id: "" });  // ID vacío = crear nuevo
```

**Problema**: Funciona pero si `service.id` es usado para lógica de edición (`isEditing = !!service`), esto crea un servicio vacío con datos copiados correctamente pero el diálogo muestra "Nuevo Servicio" en lugar de "Duplicar Servicio".

---

## Mejoras Propuestas

### Paso 1: Corregir Schema (full-schema.sql)

**A) Eliminar línea duplicada (línea 340)**:
```sql
-- Eliminar línea 340 que duplica payment_status
```

**B) Añadir campo `created_by` a services**:
```sql
CREATE TABLE IF NOT EXISTS public.services (
  ...
  created_by uuid,  -- NUEVO
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### Paso 2: Añadir Índices de Rendimiento

```sql
-- Índices para services
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Índices para tablas relacionadas (búsqueda por servicio)
CREATE INDEX IF NOT EXISTS idx_invoice_services_service_id ON invoice_services(service_id);
CREATE INDEX IF NOT EXISTS idx_quote_services_service_id ON quote_services(service_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_service_id ON contract_services(service_id);
```

---

### Paso 3: Crear Función de Verificación de Uso

Añadir función SQL para verificar si un servicio está en uso:

```sql
CREATE OR REPLACE FUNCTION public.check_service_usage(p_service_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'in_invoices', (SELECT COUNT(*) FROM invoice_services WHERE service_id = p_service_id),
    'in_quotes', (SELECT COUNT(*) FROM quote_services WHERE service_id = p_service_id),
    'in_contracts', (SELECT COUNT(*) FROM contract_services WHERE service_id = p_service_id),
    'can_delete', (
      NOT EXISTS (SELECT 1 FROM invoice_services WHERE service_id = p_service_id) AND
      NOT EXISTS (SELECT 1 FROM quote_services WHERE service_id = p_service_id) AND
      NOT EXISTS (SELECT 1 FROM contract_services WHERE service_id = p_service_id)
    )
  );
$$;
```

---

### Paso 4: Mejorar Hook useServices

Añadir hook para verificar uso antes de eliminar:

```typescript
// En src/hooks/useServices.tsx

export function useCheckServiceUsage() {
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { data, error } = await supabase
        .rpc('check_service_usage', { p_service_id: serviceId });
      
      if (error) throw error;
      return data as {
        in_invoices: number;
        in_quotes: number;
        in_contracts: number;
        can_delete: boolean;
      };
    },
  });
}
```

---

### Paso 5: Mejorar Diálogo de Eliminación

Actualizar `src/pages/Services.tsx` para mostrar advertencia cuando el servicio está en uso:

```typescript
// Añadir estado para mostrar uso
const [serviceUsage, setServiceUsage] = useState<{
  in_invoices: number;
  in_quotes: number;
  in_contracts: number;
} | null>(null);

// Antes de abrir diálogo de eliminación, verificar uso
const handleDelete = async (service: Service) => {
  const usage = await checkUsage.mutateAsync(service.id);
  setServiceUsage(usage);
  setServiceToDelete(service);
  setDeleteDialogOpen(true);
};

// En el diálogo, mostrar advertencia si está en uso
{!serviceUsage?.can_delete && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Este servicio está siendo usado en:
      {serviceUsage?.in_invoices > 0 && ` ${serviceUsage.in_invoices} factura(s),`}
      {serviceUsage?.in_quotes > 0 && ` ${serviceUsage.in_quotes} presupuesto(s),`}
      {serviceUsage?.in_contracts > 0 && ` ${serviceUsage.in_contracts} contrato(s)`}
      <br />No puede eliminarse mientras esté referenciado.
    </AlertDescription>
  </Alert>
)}
```

---

### Paso 6: Mejorar Funcionalidad de Duplicar

Añadir título claro para duplicación:

```typescript
// En ServiceFormDialog
const isDuplicating = service && !service.id;
const dialogTitle = isDuplicating 
  ? "Duplicar Servicio" 
  : isEditing 
    ? "Editar Servicio" 
    : "Nuevo Servicio";
```

---

### Paso 7: Crear Migración v1.12.0

Crear archivo `easypanel/init-scripts/migrations/v1.12.0_services_improvements.sql`:

```sql
-- v1.12.0: Mejoras tabla services
-- 1. Campo created_by
-- 2. Índices de rendimiento
-- 3. Función check_service_usage
-- 4. Aplicar triggers pendientes

-- Campo created_by
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_by uuid;

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_invoice_services_service_id ON invoice_services(service_id);
CREATE INDEX IF NOT EXISTS idx_quote_services_service_id ON quote_services(service_id);
CREATE INDEX IF NOT EXISTS idx_contract_services_service_id ON contract_services(service_id);

-- Función de verificación
CREATE OR REPLACE FUNCTION public.check_service_usage(p_service_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'in_invoices', (SELECT COUNT(*) FROM invoice_services WHERE service_id = p_service_id),
    'in_quotes', (SELECT COUNT(*) FROM quote_services WHERE service_id = p_service_id),
    'in_contracts', (SELECT COUNT(*) FROM contract_services WHERE service_id = p_service_id),
    'can_delete', (
      NOT EXISTS (SELECT 1 FROM invoice_services WHERE service_id = p_service_id) AND
      NOT EXISTS (SELECT 1 FROM quote_services WHERE service_id = p_service_id) AND
      NOT EXISTS (SELECT 1 FROM contract_services WHERE service_id = p_service_id)
    )
  );
$$;

-- Trigger updated_at para services
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Registrar versión
INSERT INTO schema_versions (version, description)
VALUES ('v1.12.0', 'Mejoras tabla services: campo created_by, índices, función check_usage, trigger updated_at')
ON CONFLICT (version) DO NOTHING;
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `easypanel/init-scripts/full-schema.sql` | Eliminar línea duplicada, añadir created_by, índices |
| `easypanel/init-scripts/postgres-external-schema.sql` | Mismos cambios |
| `easypanel/init-scripts/INSTALL.sql` | Actualizar definición services |
| `src/hooks/useServices.tsx` | Añadir useCheckServiceUsage |
| `src/pages/Services.tsx` | Validar uso antes de eliminar, mejorar UX |
| `src/components/services/ServiceFormDialog.tsx` | Título para duplicar |
| `easypanel/init-scripts/migrations/v1.12.0_services_improvements.sql` | Nueva migración |
| `easypanel/README-migrations.md` | Documentar v1.12.0 |

---

## Resumen de Problemas por Severidad

| Severidad | Problema | Solución |
|-----------|----------|----------|
| CRÍTICO | Columna duplicada en schema | Eliminar línea 340 |
| ALTO | Triggers no aplicados | Crear migración v1.12.0 |
| MEDIO | Sin validación al eliminar | Añadir función + UI |
| BAJO | Falta created_by | Añadir columna |
| BAJO | Faltan índices | Crear índices |
| MENOR | UX duplicar | Mejorar título diálogo |
