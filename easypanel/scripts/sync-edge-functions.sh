#!/bin/bash
# =============================================================================
# Sincronización Definitiva de Edge Functions para Supabase Self-Hosted
# 
# Métodos de sincronización (por prioridad):
#   1. Volumen directo: EDGE_FUNCTIONS_VOLUME (más rápido, sin restart)
#   2. Docker socket: docker cp + restart (fallback)
#
# Variables de entorno:
#   - EDGE_FUNCTIONS_VOLUME: Ruta al volumen montado de edge-functions
#   - EDGE_RUNTIME_CONTAINER: Nombre del contenedor edge-runtime
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
log_step() { echo -e "${CYAN}→ $1${NC}"; }

# === Configuración ===
FUNCTIONS_SOURCE="/app/supabase/functions"
EDGE_FUNCTIONS_PATH="/home/deno/functions"
DOCKER_SOCKET="/var/run/docker.sock"
VERSION_FILE="$FUNCTIONS_SOURCE/version.json"

echo ""
echo "=========================================="
echo "  Edge Functions - Sincronización"
echo "=========================================="
echo ""

# === Verificar directorio de funciones ===
if [ ! -d "$FUNCTIONS_SOURCE" ]; then
    log_error "No se encontró directorio de funciones: $FUNCTIONS_SOURCE"
    exit 1
fi

# === Obtener lista de funciones del repositorio ===
REPO_FUNCTIONS=$(find "$FUNCTIONS_SOURCE" -maxdepth 1 -type d ! -name "functions" -exec basename {} \; | sort)
REPO_COUNT=$(echo "$REPO_FUNCTIONS" | grep -c . || echo "0")

log_info "Funciones en repositorio: $REPO_COUNT"
echo "$REPO_FUNCTIONS" | while read fn; do
    [ -n "$fn" ] && echo "   - $fn"
done

# === Función para crear _main (healthcheck) ===
create_main_function() {
    local target_dir="$1"
    log_step "Creando función _main (healthcheck)..."
    
    mkdir -p "$target_dir/_main"
    cat > "$target_dir/_main/index.ts" << 'EOF'
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/_main/health" || url.pathname === "/health") {
    return new Response(JSON.stringify({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      message: "Edge Functions Ready"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("Edge Functions Ready", { status: 200 });
});
EOF
}

# === Función para verificar coincidencia ===
verify_functions() {
    local target_dir="$1"
    local method="$2"
    
    echo ""
    log_info "Verificando funciones desplegadas..."
    
    if [ "$method" = "volume" ]; then
        DEPLOYED_FUNCTIONS=$(find "$target_dir" -maxdepth 1 -type d ! -name "$(basename $target_dir)" -exec basename {} \; 2>/dev/null | sort)
    else
        DEPLOYED_FUNCTIONS=$(docker exec "$EDGE_CONTAINER" ls -1 "$EDGE_FUNCTIONS_PATH" 2>/dev/null | sort)
    fi
    
    DEPLOYED_COUNT=$(echo "$DEPLOYED_FUNCTIONS" | grep -c . || echo "0")
    
    echo ""
    log_info "Funciones desplegadas: $DEPLOYED_COUNT"
    echo "$DEPLOYED_FUNCTIONS" | while read fn; do
        [ -n "$fn" ] && echo "   - $fn"
    done
    
    # Comparar
    MISSING=""
    for fn in $REPO_FUNCTIONS; do
        if ! echo "$DEPLOYED_FUNCTIONS" | grep -q "^${fn}$"; then
            MISSING="$MISSING $fn"
        fi
    done
    
    if [ -z "$MISSING" ]; then
        log_success "Verificación OK: Todas las funciones sincronizadas"
        return 0
    else
        log_warn "Funciones faltantes:$MISSING"
        return 1
    fi
}

# =============================================================================
# MÉTODO 1: Volumen Directo (Preferido)
# =============================================================================
if [ -n "$EDGE_FUNCTIONS_VOLUME" ] && [ -d "$EDGE_FUNCTIONS_VOLUME" ]; then
    echo ""
    log_info "Método: Volumen Directo"
    log_info "Destino: $EDGE_FUNCTIONS_VOLUME"
    
    # Limpiar funciones antiguas
    log_step "Limpiando funciones antiguas..."
    rm -rf "$EDGE_FUNCTIONS_VOLUME"/*
    
    # Copiar funciones del repositorio
    COPIED=0
    FAILED=0
    
    for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
        if [ -d "$fn_dir" ]; then
            fn_name=$(basename "$fn_dir")
            
            if cp -r "$fn_dir" "$EDGE_FUNCTIONS_VOLUME/"; then
                log_success "Copiada: $fn_name"
                ((COPIED++))
            else
                log_error "Error: $fn_name"
                ((FAILED++))
            fi
        fi
    done
    
    # Copiar archivos adicionales
    for extra_file in "version.json" "import_map.json"; do
        if [ -f "$FUNCTIONS_SOURCE/$extra_file" ]; then
            cp "$FUNCTIONS_SOURCE/$extra_file" "$EDGE_FUNCTIONS_VOLUME/" && \
                log_info "Copiado: $extra_file"
        fi
    done
    
    # Crear función _main
    create_main_function "$EDGE_FUNCTIONS_VOLUME"
    
    echo ""
    log_success "Sincronización por volumen: $COPIED funciones copiadas, $FAILED fallidas"
    
    # Verificar
    verify_functions "$EDGE_FUNCTIONS_VOLUME" "volume"
    
    # No requiere restart con volumen montado correctamente
    log_info "Las funciones estarán disponibles inmediatamente"
    
    exit 0
fi

# =============================================================================
# MÉTODO 2: Docker Socket (Fallback)
# =============================================================================
if [ -S "$DOCKER_SOCKET" ]; then
    echo ""
    log_info "Método: Docker Socket"
    
    # Obtener nombre del contenedor edge-runtime
    if [ -n "$EDGE_RUNTIME_CONTAINER" ]; then
        log_info "Usando contenedor configurado: $EDGE_RUNTIME_CONTAINER"
        EDGE_CONTAINER="$EDGE_RUNTIME_CONTAINER"
    else
        log_info "Buscando contenedor edge-runtime automáticamente..."
        EDGE_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "(edge-functions|supabase-functions|edge-runtime)" | head -1)
    fi
    
    if [ -z "$EDGE_CONTAINER" ]; then
        log_warn "No se encontró contenedor edge-runtime"
        log_info "Configura EDGE_RUNTIME_CONTAINER con el nombre del contenedor"
        log_info "Para encontrarlo: docker ps | grep functions"
        exit 0
    fi
    
    # Verificar que el contenedor existe y está corriendo
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${EDGE_CONTAINER}$"; then
        log_error "El contenedor '$EDGE_CONTAINER' no existe o no está corriendo"
        log_info "Contenedores disponibles:"
        docker ps --format '{{.Names}}' 2>/dev/null | head -10
        exit 0
    fi
    
    log_success "Contenedor encontrado: $EDGE_CONTAINER"
    
    # Limpiar funciones antiguas en el contenedor
    log_step "Limpiando funciones antiguas en contenedor..."
    docker exec "$EDGE_CONTAINER" rm -rf "$EDGE_FUNCTIONS_PATH"/* 2>/dev/null || true
    
    # Copiar funciones
    log_info "Copiando funciones a $EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH..."
    
    COPIED=0
    FAILED=0
    
    for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
        if [ -d "$fn_dir" ]; then
            fn_name=$(basename "$fn_dir")
            
            # Crear directorio destino
            docker exec "$EDGE_CONTAINER" mkdir -p "$EDGE_FUNCTIONS_PATH/$fn_name" 2>/dev/null || true
            
            # Copiar contenido
            if docker cp "$fn_dir." "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/$fn_name/" 2>/dev/null; then
                log_success "Copiada: $fn_name"
                ((COPIED++))
            else
                log_error "Error: $fn_name"
                ((FAILED++))
            fi
        fi
    done
    
    # Copiar archivos adicionales
    for extra_file in "version.json" "import_map.json"; do
        if [ -f "$FUNCTIONS_SOURCE/$extra_file" ]; then
            docker cp "$FUNCTIONS_SOURCE/$extra_file" "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/" 2>/dev/null && \
                log_info "Copiado: $extra_file"
        fi
    done
    
    # Crear función _main en contenedor
    log_step "Creando función _main en contenedor..."
    docker exec "$EDGE_CONTAINER" mkdir -p "$EDGE_FUNCTIONS_PATH/_main" 2>/dev/null || true
    
    MAIN_FUNCTION='Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/_main/health" || url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("Edge Functions Ready", { status: 200 });
});'
    
    echo "$MAIN_FUNCTION" > /tmp/_main_index.ts
    docker cp /tmp/_main_index.ts "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/_main/index.ts" 2>/dev/null
    rm -f /tmp/_main_index.ts
    
    echo ""
    log_success "Sincronización por Docker: $COPIED funciones copiadas, $FAILED fallidas"
    
    # Verificar antes de restart
    verify_functions "" "docker"
    
    # Reiniciar edge-runtime
    echo ""
    log_info "Reiniciando edge-runtime..."
    if docker restart "$EDGE_CONTAINER" 2>/dev/null; then
        log_success "Contenedor reiniciado: $EDGE_CONTAINER"
        log_info "Las Edge Functions estarán disponibles en ~5 segundos"
    else
        log_warn "No se pudo reiniciar el contenedor"
        log_info "Reinicia manualmente: docker restart $EDGE_CONTAINER"
    fi
    
    exit 0
fi

# =============================================================================
# NO HAY MÉTODO DISPONIBLE
# =============================================================================
echo ""
log_warn "No hay método de sincronización disponible"
echo ""
echo "Configura una de las siguientes opciones en EasyPanel:"
echo ""
echo "  Opción 1 (Recomendada): Volumen Directo"
echo "    EDGE_FUNCTIONS_VOLUME=/etc/easypanel/.../functions"
echo ""
echo "  Opción 2: Docker Socket"
echo "    Mount: /var/run/docker.sock → /var/run/docker.sock"
echo "    EDGE_RUNTIME_CONTAINER=proyecto_supabase-functions-1"
echo ""

exit 0
