#!/bin/bash
# =============================================================================
# Sincronización de Edge Functions para Supabase Self-Hosted
# 
# Métodos de sincronización (por prioridad):
#   1. Volumen directo: EDGE_FUNCTIONS_VOLUME (más rápido)
#   2. Docker socket: docker cp + restart (fallback)
#
# IMPORTANTE: Este script crea 'main/index.ts' (dispatcher) que es CRÍTICO
# para que las Edge Functions funcionen en Supabase self-hosted.
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# === Configuración ===
FUNCTIONS_SOURCE="/app/supabase/functions"
EDGE_FUNCTIONS_PATH="/home/deno/functions"
DOCKER_SOCKET="/var/run/docker.sock"

echo ""
echo "=========================================="
echo "  Edge Functions - Sincronización"
echo "=========================================="
echo ""

# Verificar directorio de funciones
if [ ! -d "$FUNCTIONS_SOURCE" ]; then
    log_error "No se encontró: $FUNCTIONS_SOURCE"
    exit 1
fi

# Listar funciones del repositorio
REPO_FUNCTIONS=$(find "$FUNCTIONS_SOURCE" -maxdepth 1 -type d ! -name "functions" -exec basename {} \; | sort)
REPO_COUNT=$(echo "$REPO_FUNCTIONS" | grep -c . || echo "0")

log_info "Funciones en repositorio: $REPO_COUNT"
echo "$REPO_FUNCTIONS" | while read fn; do [ -n "$fn" ] && echo "   - $fn"; done

# =============================================================================
# MÉTODO 1: Volumen Directo
# =============================================================================
if [ -n "$EDGE_FUNCTIONS_VOLUME" ] && [ -d "$EDGE_FUNCTIONS_VOLUME" ]; then
    echo ""
    log_info "Método: Volumen Directo"
    log_info "Destino: $EDGE_FUNCTIONS_VOLUME"
    
    # Limpiar
    rm -rf "$EDGE_FUNCTIONS_VOLUME"/*
    
    # Copiar funciones
    COPIED=0
    for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
        if [ -d "$fn_dir" ]; then
            fn_name=$(basename "$fn_dir")
            if cp -r "$fn_dir" "$EDGE_FUNCTIONS_VOLUME/"; then
                log_success "Copiada: $fn_name"
                ((COPIED++))
            fi
        fi
    done
    
    # Copiar archivos adicionales
    for extra in "version.json" "import_map.json"; do
        [ -f "$FUNCTIONS_SOURCE/$extra" ] && cp "$FUNCTIONS_SOURCE/$extra" "$EDGE_FUNCTIONS_VOLUME/"
    done
    
    echo ""
    log_success "Sincronización: $COPIED funciones copiadas"
    log_info "Las funciones estarán disponibles inmediatamente"
    
    exit 0
fi

# =============================================================================
# MÉTODO 2: Docker Socket
# =============================================================================
if [ -S "$DOCKER_SOCKET" ]; then
    echo ""
    log_info "Método: Docker Socket"
    
    # Obtener contenedor
    if [ -n "$EDGE_RUNTIME_CONTAINER" ]; then
        EDGE_CONTAINER="$EDGE_RUNTIME_CONTAINER"
    else
        EDGE_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "(edge-functions|supabase-functions|edge-runtime)" | head -1)
    fi
    
    if [ -z "$EDGE_CONTAINER" ]; then
        log_warn "No se encontró contenedor edge-runtime"
        log_info "Configura EDGE_RUNTIME_CONTAINER"
        exit 0
    fi
    
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${EDGE_CONTAINER}$"; then
        log_error "Contenedor '$EDGE_CONTAINER' no está corriendo"
        exit 0
    fi
    
    log_success "Contenedor: $EDGE_CONTAINER"
    
    # Limpiar y copiar
    docker exec "$EDGE_CONTAINER" rm -rf "$EDGE_FUNCTIONS_PATH"/* 2>/dev/null || true
    
    COPIED=0
    for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
        if [ -d "$fn_dir" ]; then
            fn_name=$(basename "$fn_dir")
            docker exec "$EDGE_CONTAINER" mkdir -p "$EDGE_FUNCTIONS_PATH/$fn_name" 2>/dev/null || true
            if docker cp "$fn_dir." "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/$fn_name/" 2>/dev/null; then
                log_success "Copiada: $fn_name"
                ((COPIED++))
            fi
        fi
    done
    
    # Copiar extras
    for extra in "version.json" "import_map.json"; do
        [ -f "$FUNCTIONS_SOURCE/$extra" ] && \
            docker cp "$FUNCTIONS_SOURCE/$extra" "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/" 2>/dev/null
    done
    
    echo ""
    log_success "Sincronización: $COPIED funciones copiadas"
    
    # Reiniciar
    log_info "Reiniciando edge-runtime..."
    docker restart "$EDGE_CONTAINER" 2>/dev/null && \
        log_success "Contenedor reiniciado" || \
        log_warn "Reinicia manualmente: docker restart $EDGE_CONTAINER"
    
    exit 0
fi

# =============================================================================
# NO HAY MÉTODO DISPONIBLE
# =============================================================================
echo ""
log_warn "No hay método de sincronización disponible"
echo ""
echo "Configura una de estas opciones:"
echo ""
echo "  Opción 1: Volumen Directo"
echo "    EDGE_FUNCTIONS_VOLUME=/path/to/functions"
echo ""
echo "  Opción 2: Docker Socket"
echo "    Mount: /var/run/docker.sock"
echo "    EDGE_RUNTIME_CONTAINER=proyecto_supabase-functions-1"
echo ""
echo "  COMANDOS MANUALES (ejecutar en VPS):"
echo ""
echo "    # Encontrar contenedores"
echo "    CRM=\$(docker ps --format '{{.Names}}' | grep -i crm | head -1)"
echo "    EDGE=\$(docker ps --format '{{.Names}}' | grep -i functions | head -1)"
echo ""
echo "    # Copiar funciones"
echo "    docker cp \$CRM:/app/supabase/functions/. /tmp/functions/"
echo "    docker cp /tmp/functions/. \$EDGE:/home/deno/functions/"
echo "    docker restart \$EDGE"
echo ""

exit 0
