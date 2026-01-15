# Sistema de Migraciones - CRM

Este documento describe el sistema de versionado y migraciones para mantener sincronizadas todas las instalaciones del CRM.

## Estructura de Versiones

```
easypanel/init-scripts/
├── full-schema.sql              # Schema completo para Supabase
├── postgres-external-schema.sql # Schema para PostgreSQL externo
└── migrations/
    ├── apply_all.sql            # Aplicador inteligente
    ├── v1.0.0_2024-12-01_base.sql
    ├── v1.1.0_2024-12-17_pdf_settings.sql
    └── v1.2.0_2024-12-17_email_signature.sql
```

## Versionado Semántico

Usamos **SemVer** para las versiones:

- **MAJOR** (v2.0.0): Cambios incompatibles o restructuración completa
- **MINOR** (v1.1.0): Nuevas funcionalidades retrocompatibles
- **PATCH** (v1.0.1): Correcciones de bugs

Formato de archivos: `vX.Y.Z_YYYY-MM-DD_descripcion.sql`

## Tabla de Control

```sql
CREATE TABLE schema_versions (
  id uuid PRIMARY KEY,
  version text UNIQUE,      -- 'v1.1.0'
  description text,         -- 'Añade tabla pdf_settings'
  applied_at timestamptz,   -- Fecha de aplicación
  applied_by text           -- Usuario que ejecutó
);
```

## Flujo de Trabajo

### Nueva Instalación

1. Ejecutar `full-schema.sql` (Supabase) o `postgres-external-schema.sql` (PG externo)
2. El schema base ya incluye la versión más reciente
3. La tabla `schema_versions` registra la versión instalada

### Actualización de Instalación Existente

1. Conectar a la base de datos (Supabase SQL Editor o cliente PostgreSQL)
2. Ejecutar `migrations/apply_all.sql`
3. El script:
   - Detecta versión actual
   - Aplica solo migraciones pendientes
   - Registra cada migración aplicada
   - Muestra resumen al finalizar

```sql
-- Ejemplo de salida
╔═══════════════════════════════════════════════════╗
║        MIGRACIONES CRM - RESUMEN                  ║
╠═══════════════════════════════════════════════════╣
║  Versión actual: v1.2.0                           ║
║  Total migraciones: 3                             ║
╚═══════════════════════════════════════════════════╝

version  | description                              | applied_at
---------+------------------------------------------+------------------
v1.0.0   | Instalación base del schema CRM         | 2024-12-01 10:00
v1.1.0   | Tabla pdf_settings                      | 2024-12-17 14:30
v1.2.0   | Columna signature_html                  | 2024-12-17 14:30
```

## Comandos Útiles

### Verificar versión actual

```sql
SELECT get_current_schema_version();
-- Resultado: 'v1.2.0'
```

### Ver historial de migraciones

```sql
SELECT version, description, applied_at 
FROM schema_versions 
ORDER BY applied_at;
```

### Verificar si una versión está aplicada

```sql
SELECT is_version_applied('v1.1.0');
-- Resultado: true/false
```

## Crear Nueva Migración

1. Crear archivo `vX.Y.Z_YYYY-MM-DD_descripcion.sql` en `/migrations`
2. Seguir plantilla:

```sql
-- ============================================
-- MIGRACIÓN vX.Y.Z - [Descripción]
-- Fecha: YYYY-MM-DD
-- Descripción: [Detalle de cambios]
-- ============================================

DO $$
BEGIN
  -- Verificar si ya está aplicada
  IF EXISTS (SELECT 1 FROM schema_versions WHERE version = 'vX.Y.Z') THEN
    RAISE NOTICE 'Migración vX.Y.Z ya aplicada - omitiendo';
    RETURN;
  END IF;

  -- TUS CAMBIOS AQUÍ
  -- Crear tablas, columnas, índices, etc.

  -- Registrar migración
  INSERT INTO schema_versions (version, description, applied_at)
  VALUES ('vX.Y.Z', 'Descripción del cambio', now());

  RAISE NOTICE '✅ Migración vX.Y.Z aplicada correctamente';
END $$;
```

3. Añadir la migración a `apply_all.sql`
4. Actualizar `full-schema.sql` y `postgres-external-schema.sql` con los cambios

## Principios de Diseño

### Idempotencia
Cada migración puede ejecutarse múltiples veces sin efectos adversos:
- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (mediante verificación)
- Verificación previa con `schema_versions`

### Retrocompatibilidad
Las migraciones no deben romper código existente:
- Nuevas columnas con valores DEFAULT
- Nuevas tablas opcionales
- Sin eliminar columnas en uso

### Atomicidad
Cada migración es una unidad completa:
- Si falla, no deja estado parcial
- Se registra solo si completa correctamente

## Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| v1.0.0 | 2024-12-01 | Schema base inicial |
| v1.1.0 | 2024-12-17 | Tabla `pdf_settings` para personalización de documentos |
| v1.2.0 | 2024-12-17 | Columna `signature_html` en `email_settings` |
| v1.3.0 | 2024-12-17 | RLS para `schema_versions` - lectura pública |
| v1.4.0 | 2024-12-18 | Columnas `is_sent` y `sent_at` en invoices, quotes, contracts |
| v1.5.0 | 2024-12-18 | Tabla `email_logs`, tabla `gmail_config`, columna `provider` en email_settings |
| v1.6.0 | 2025-01-03 | Expenses: `expense_number` cambiado a TEXT UNIQUE, nueva columna `id_factura` |
| v1.7.0 | 2025-01-15 | Migración de todos los ENUMs a español (activo/inactivo, borrador/emitida, etc.) |

## Troubleshooting

### "La migración X no se aplica"

1. Verificar que la tabla `schema_versions` existe
2. Comprobar si ya está registrada: `SELECT * FROM schema_versions WHERE version = 'vX.Y.Z'`
3. Si hay inconsistencia, eliminar el registro y re-ejecutar

### "Error en migración"

1. Revisar el mensaje de error específico
2. Verificar permisos del usuario
3. Comprobar que las dependencias (tablas, funciones) existen

### "No sé qué versión tengo"

```sql
-- Ver todas las versiones
SELECT * FROM schema_versions ORDER BY applied_at;

-- Ver solo la más reciente
SELECT get_current_schema_version();
```
