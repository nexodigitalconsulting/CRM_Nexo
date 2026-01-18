# 📦 Mejoras en Gestión de Remesas SEPA

## Resumen

Implementación completa de la gestión de remesas bancarias SEPA con:
- Edición de remesas existentes
- Añadir/quitar facturas vinculadas
- Flujo de estados (Pendiente → Enviada → Cobrada/Parcial/Devuelta/Anulada)
- Registro de pagos y devoluciones individuales
- Generación de XML SEPA pain.008
- Exportación a Excel

## Archivos Creados/Modificados

### Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/lib/sepa/sepaXmlGenerator.ts` | Generador XML SEPA pain.008 ISO 20022 |
| `src/lib/sepa/index.ts` | Barrel export del módulo SEPA |
| `src/components/remittances/RemittanceDetailDialog.tsx` | Diálogo completo de detalle/edición |
| `src/components/remittances/RegisterPaymentDialog.tsx` | Registro de pagos/devoluciones |
| `src/components/remittances/index.ts` | Barrel export de componentes |
| `easypanel/init-scripts/migrations/v1.10.0_2025-01-18_remittance_enhancements.sql` | Migración PostgreSQL externo |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useRemittances.tsx` | Añadidos hooks: `useRemittance`, `useUpdateRemittance`, `useAddInvoicesToRemittance`, `useRemoveInvoicesFromRemittance`, `useMarkRemittanceAsSent`, `useCancelRemittance`, `useRegisterPayment` |
| `src/pages/Remittances.tsx` | Integración FilterableDataTable, nuevas columnas, navegación a detalle |
| `src/lib/exportUtils.ts` | Ampliada config de export remesas con nuevos campos |
| `ROADMAP.md` | Marcada FASE 3.2 como completada |

## Migración Base de Datos

### Nuevos Campos en `remittances`

```sql
collection_date DATE        -- Fecha de cobro solicitada al banco
sent_to_bank_at TIMESTAMPTZ -- Cuándo se envió al banco
paid_amount NUMERIC(12,2)   -- Importe cobrado (para parciales)
cancelled_at TIMESTAMPTZ    -- Fecha de anulación
cancelled_reason TEXT       -- Motivo de anulación
```

### Nuevos Campos SEPA en `clients`

```sql
bic TEXT                    -- Código BIC/SWIFT
sepa_mandate_id TEXT        -- ID del mandato SEPA
sepa_mandate_date DATE      -- Fecha firma mandato
sepa_sequence_type TEXT     -- Tipo secuencia (FRST, RCUR, OOFF, FNAL)
```

### Nuevos Campos en `company_settings`

```sql
sepa_creditor_id TEXT       -- Identificador de Acreedor SEPA
bic TEXT                    -- BIC de la empresa
```

### Nueva Tabla `remittance_payments`

```sql
CREATE TABLE remittance_payments (
    id UUID PRIMARY KEY,
    remittance_id UUID NOT NULL REFERENCES remittances(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT CHECK (status IN ('cobrado', 'devuelto', 'rechazado')),
    return_reason TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID
);
```

### Nuevos Estados de Remesa

- `enviada` - Enviada al banco
- `devuelta` - Devuelta por el banco
- `anulada` - Anulada manualmente

## Flujo de Estados

```
┌─────────────┐
│  PENDIENTE  │ ← Estado inicial
└──────┬──────┘
       │ "Marcar como Enviada"
       ▼
┌─────────────┐
│   ENVIADA   │
└──────┬──────┘
       │ Registrar pagos/devoluciones
       ├───────────────────────────────┐
       ▼                               ▼
┌─────────────┐               ┌─────────────┐
│   COBRADA   │               │   PARCIAL   │
└─────────────┘               └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  DEVUELTA   │
                              └─────────────┘

En cualquier momento (antes de cobrada):
       ▼
┌─────────────┐
│   ANULADA   │ ← Libera todas las facturas
└─────────────┘
```

## Uso del Generador SEPA XML

```typescript
import { createSepaXmlFromRemittance, downloadSepaXml } from "@/lib/sepa";

const creditor: SepaCreditor = {
  name: "Mi Empresa S.L.",
  iban: "ES7921000813610123456789",
  bic: "CAIXESBBXXX",
  creditorId: "ES12345678A",
  country: "ES"
};

const xml = createSepaXmlFromRemittance(remittance, creditor, validInvoices);
downloadSepaXml(xml, `SEPA_REM001_20250118`);
```

## Configuración Requerida

### 1. Datos de Empresa (Settings > Empresa)

- **Identificador de Acreedor SEPA**: Obligatorio para generar XML
- **IBAN**: Cuenta de cobro
- **BIC**: Código SWIFT del banco (opcional)

### 2. Datos de Cliente

Para cada cliente que vaya en remesa:
- **IBAN**: Cuenta a debitar
- **ID Mandato SEPA**: Referencia del mandato firmado
- **Fecha Mandato**: Fecha de firma
- **Tipo Secuencia**: RCUR (recurrente), FRST (primera), OOFF (única)

## Replicación en PostgreSQL Externo

1. Aplicar la migración:
```bash
psql -U crm_user -d crm_database -f v1.10.0_2025-01-18_remittance_enhancements.sql
```

2. Verificar:
```sql
SELECT * FROM schema_versions WHERE version = '1.10.0';
```

## Testing

### Crear Remesa
1. Ir a /remittances
2. Click "Nueva Remesa"
3. Seleccionar facturas emitidas
4. Establecer código y fecha cobro
5. Click "Crear Remesa"

### Editar Remesa
1. Click en una remesa pendiente
2. Modificar código, fecha cobro, notas
3. Añadir/quitar facturas
4. Guardar cambios

### Descargar XML SEPA
1. Abrir detalle de remesa
2. Click "Descargar XML SEPA"
3. El fichero cumple ISO 20022 pain.008.001.02

### Registrar Pagos
1. Marcar remesa como "Enviada"
2. Click "Registrar Pagos/Devoluciones"
3. Seleccionar facturas y estado (Cobrado/Devuelto)
4. Indicar motivo si es devolución

### Anular Remesa
1. Abrir detalle
2. Click "Anular Remesa"
3. Opcional: indicar motivo
4. Las facturas vuelven a estar disponibles

## Notas de Implementación

- El XML SEPA excluye automáticamente facturas sin datos SEPA válidos
- Al anular una remesa, todas las facturas se liberan (`remittance_id = null`)
- El `paid_amount` se calcula automáticamente al registrar pagos
- Los pagos tipo "devuelto" liberan la factura de la remesa
- Facturas pagadas cambian su estado a "pagada"
