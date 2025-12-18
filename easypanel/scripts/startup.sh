#!/bin/bash
# =============================================================================
# CRM Startup Script para Easypanel
# Verificación completa, migraciones, sincronización Edge Functions, Nginx
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_section() { echo -e "${CYAN}--- $1 ---${NC}"; }

# Versión del schema esperada por el código
CODE_SCHEMA_VERSION="v1.4.0"

echo ""
echo "=========================================="
echo "  CRM Web - Verificación e Inicio"
echo "=========================================="
echo ""

# =============================================================================
# PASO 1: Verificar PostgreSQL
# =============================================================================
log_section "PostgreSQL"

if [ -n "$EXTERNAL_POSTGRES_HOST" ] && [ -n "$EXTERNAL_POSTGRES_PASSWORD" ]; then
    PG_HOST="${EXTERNAL_POSTGRES_HOST}"
    PG_PORT="${EXTERNAL_POSTGRES_PORT:-5432}"
    PG_DB="${EXTERNAL_POSTGRES_DB:-postgres}"
    PG_USER="${EXTERNAL_POSTGRES_USER:-postgres}"
    
    log_info "Host: $PG_HOST:$PG_PORT"
    log_info "Base de datos: $PG_DB"
    
    # Intentar conexión con psql si está disponible
    if command -v psql &> /dev/null; then
        export PGPASSWORD="$EXTERNAL_POSTGRES_PASSWORD"
        
        if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT 1" &> /dev/null; then
            log_success "Conexión PostgreSQL OK"
            
            # Obtener versión del schema
            DB_VERSION=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -t -c \
                "SELECT COALESCE((SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1), 'v0.0.0')" 2>/dev/null | tr -d ' ')
            
            if [ -n "$DB_VERSION" ]; then
                log_info "Versión en BD: $DB_VERSION"
                log_info "Versión en código: $CODE_SCHEMA_VERSION"
                
                if [ "$DB_VERSION" = "$CODE_SCHEMA_VERSION" ]; then
                    log_success "Schema actualizado"
                else
                    log_warn "Migraciones pendientes"
                    echo "   Ejecutar: easypanel/init-scripts/migrations/apply_all.sql"
                fi
            fi
        else
            log_error "No se pudo conectar a PostgreSQL"
        fi
        
        unset PGPASSWORD
    else
        log_warn "psql no disponible para verificar conexión"
    fi
else
    log_warn "Variables PostgreSQL no configuradas"
    echo "   EXTERNAL_POSTGRES_HOST, EXTERNAL_POSTGRES_PASSWORD"
fi

echo ""

# =============================================================================
# PASO 2: Ejecutar migraciones SQL
# =============================================================================
log_section "Migraciones SQL"

if [ -n "$EXTERNAL_POSTGRES_HOST" ] && [ -n "$EXTERNAL_POSTGRES_PASSWORD" ]; then
    if [ -x "/app/easypanel/scripts/post-deploy.sh" ]; then
        log_info "Ejecutando post-deploy.sh..."
        if /app/easypanel/scripts/post-deploy.sh; then
            log_success "post-deploy.sh completado"
        else
            log_warn "post-deploy.sh falló, continuando..."
        fi
    else
        log_info "post-deploy.sh no encontrado o no ejecutable"
    fi
else
    log_warn "Saltando migraciones (PostgreSQL no configurado)"
fi

echo ""

# =============================================================================
# PASO 3: Sincronizar Edge Functions
# =============================================================================
log_section "Edge Functions"

# Verificar métodos disponibles
SYNC_METHOD="none"

if [ -n "$EDGE_FUNCTIONS_VOLUME" ] && [ -d "$EDGE_FUNCTIONS_VOLUME" ]; then
    SYNC_METHOD="volume"
    log_info "Método: Volumen Directo"
    log_info "Ruta: $EDGE_FUNCTIONS_VOLUME"
elif [ -S "/var/run/docker.sock" ]; then
    SYNC_METHOD="docker"
    log_info "Método: Docker Socket"
    if [ -n "$EDGE_RUNTIME_CONTAINER" ]; then
        log_info "Contenedor: $EDGE_RUNTIME_CONTAINER"
    else
        log_info "Contenedor: Auto-detectar"
    fi
else
    log_warn "No hay método de sincronización disponible"
    echo "   Configurar: EDGE_FUNCTIONS_VOLUME o Docker Socket"
fi

# Ejecutar sincronización
if [ "$SYNC_METHOD" != "none" ]; then
    if [ -x "/app/easypanel/scripts/sync-edge-functions.sh" ]; then
        echo ""
        /app/easypanel/scripts/sync-edge-functions.sh || {
            log_warn "sync-edge-functions.sh falló"
        }
    else
        log_warn "sync-edge-functions.sh no encontrado o no ejecutable"
    fi
fi

echo ""

# =============================================================================
# PASO 4: Verificar funciones del repositorio
# =============================================================================
log_section "Funciones en Repositorio"

FUNCTIONS_DIR="/app/supabase/functions"
if [ -d "$FUNCTIONS_DIR" ]; then
    FUNC_COUNT=$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d ! -name "functions" | wc -l)
    log_info "Total funciones: $((FUNC_COUNT - 1))"
    
    # Listar funciones
    for fn_dir in "$FUNCTIONS_DIR"/*/; do
        if [ -d "$fn_dir" ]; then
            fn_name=$(basename "$fn_dir")
            echo "   - $fn_name"
        fi
    done
    
    # Verificar version.json
    if [ -f "$FUNCTIONS_DIR/version.json" ]; then
        FUNC_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$FUNCTIONS_DIR/version.json" | cut -d'"' -f4)
        log_info "Versión funciones: $FUNC_VERSION"
    fi
else
    log_warn "Directorio de funciones no encontrado"
fi

echo ""

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo "=========================================="
echo "  Resumen de Verificación"
echo "=========================================="
echo ""

# PostgreSQL
if [ -n "$EXTERNAL_POSTGRES_HOST" ]; then
    echo "PostgreSQL:     ✅ Configurado ($EXTERNAL_POSTGRES_HOST)"
else
    echo "PostgreSQL:     ⚠️  No configurado"
fi

# Schema
if [ -n "$DB_VERSION" ]; then
    if [ "$DB_VERSION" = "$CODE_SCHEMA_VERSION" ]; then
        echo "Schema:         ✅ Actualizado ($DB_VERSION)"
    else
        echo "Schema:         ⚠️  Pendiente (BD: $DB_VERSION → Código: $CODE_SCHEMA_VERSION)"
    fi
else
    echo "Schema:         ❓ No verificado"
fi

# Edge Functions
case "$SYNC_METHOD" in
    volume)
        echo "Edge Functions: ✅ Volumen directo"
        ;;
    docker)
        echo "Edge Functions: ✅ Docker socket"
        ;;
    *)
        echo "Edge Functions: ⚠️  No configurado"
        ;;
esac

echo ""
echo "=========================================="
echo "  Iniciando Nginx..."
echo "=========================================="
echo ""

# Iniciar nginx en primer plano
exec nginx -g "daemon off;"
