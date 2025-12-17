#!/bin/bash
# =============================================================================
# Post-Deploy Script para CRM en Easypanel
# =============================================================================
# Este script se ejecuta después de cada deploy para aplicar migraciones
# automáticamente a la base de datos PostgreSQL de Supabase.
#
# USO EN EASYPANEL:
# 1. Ve a la configuración del servicio CRM
# 2. En "Advanced" → "Post Deploy Command"
# 3. Añade: /app/easypanel/scripts/post-deploy.sh
# 4. Asegúrate de que el script tiene permisos de ejecución
#
# VARIABLES DE ENTORNO REQUERIDAS:
# - EXTERNAL_POSTGRES_HOST: Host de PostgreSQL
# - EXTERNAL_POSTGRES_PORT: Puerto (default: 5432)
# - EXTERNAL_POSTGRES_DB: Base de datos (default: postgres)
# - EXTERNAL_POSTGRES_USER: Usuario (default: postgres)
# - EXTERNAL_POSTGRES_PASSWORD: Contraseña
#
# =============================================================================

set -e

echo "=========================================="
echo "CRM Post-Deploy Migration Script"
echo "=========================================="
echo "Fecha: $(date)"
echo ""

# Configuración de conexión
PGHOST="${EXTERNAL_POSTGRES_HOST:-}"
PGPORT="${EXTERNAL_POSTGRES_PORT:-5432}"
PGDATABASE="${EXTERNAL_POSTGRES_DB:-postgres}"
PGUSER="${EXTERNAL_POSTGRES_USER:-postgres}"
PGPASSWORD="${EXTERNAL_POSTGRES_PASSWORD:-}"

# Verificar variables requeridas
if [ -z "$PGHOST" ]; then
    echo "⚠️  EXTERNAL_POSTGRES_HOST no configurado"
    echo "   Saltando migración automática."
    echo "   Para habilitar, configura las variables de entorno de PostgreSQL."
    exit 0
fi

if [ -z "$PGPASSWORD" ]; then
    echo "⚠️  EXTERNAL_POSTGRES_PASSWORD no configurado"
    echo "   Saltando migración automática."
    exit 0
fi

# Exportar variables para psql
export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

echo "Conectando a: $PGHOST:$PGPORT/$PGDATABASE"
echo ""

# Verificar conexión
echo "1. Verificando conexión a PostgreSQL..."
if ! psql -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: No se puede conectar a PostgreSQL"
    echo "   Host: $PGHOST"
    echo "   Puerto: $PGPORT"
    echo "   Base de datos: $PGDATABASE"
    exit 1
fi
echo "✅ Conexión exitosa"
echo ""

# Verificar si existe la tabla schema_versions
echo "2. Verificando estado del schema..."
SCHEMA_EXISTS=$(psql -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_versions');" | tr -d ' ')

if [ "$SCHEMA_EXISTS" = "f" ]; then
    echo "⚠️  Tabla schema_versions no existe"
    echo "   La base de datos no ha sido inicializada."
    echo ""
    echo "   Para inicializar, ejecuta manualmente:"
    echo "   easypanel/init-scripts/full-schema.sql"
    exit 0
fi

# Obtener versión actual
echo "3. Obteniendo versión actual..."
CURRENT_VERSION=$(psql -t -c "SELECT COALESCE((SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1), 'none');" | tr -d ' ')
echo "   Versión actual: $CURRENT_VERSION"
echo ""

# Versión objetivo
TARGET_VERSION="v1.2.0"
echo "   Versión objetivo: $TARGET_VERSION"
echo ""

# Comparar versiones
if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
    echo "✅ El schema está actualizado (${TARGET_VERSION})"
    exit 0
fi

# Aplicar migraciones
echo "4. Aplicando migraciones..."
MIGRATION_FILE="/app/easypanel/init-scripts/migrations/apply_all.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de migraciones"
    echo "   Esperado: $MIGRATION_FILE"
    exit 1
fi

echo "   Ejecutando: $MIGRATION_FILE"
echo ""

if psql -f "$MIGRATION_FILE"; then
    echo ""
    echo "✅ Migraciones aplicadas correctamente"
else
    echo ""
    echo "❌ Error al aplicar migraciones"
    exit 1
fi

# Verificar nueva versión
echo ""
echo "5. Verificando resultado..."
NEW_VERSION=$(psql -t -c "SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;" | tr -d ' ')
echo "   Nueva versión: $NEW_VERSION"

# Mostrar historial
echo ""
echo "6. Historial de versiones:"
psql -c "SELECT version, description, applied_at FROM schema_versions ORDER BY applied_at;"

echo ""
echo "=========================================="
echo "Post-Deploy completado"
echo "=========================================="
