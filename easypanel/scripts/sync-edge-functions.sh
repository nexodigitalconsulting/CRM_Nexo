#!/bin/bash
# =============================================================================
# Sincronización de Edge Functions para Supabase Self-Hosted
# Usa docker cp para copiar funciones directamente al contenedor edge-runtime
# =============================================================================

set -e

# Colores para output
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
echo "  Sincronización de Edge Functions"
echo "=========================================="
echo ""

# === Verificar Docker socket ===
if [ ! -S "$DOCKER_SOCKET" ]; then
    log_warn "Docker socket no disponible en $DOCKER_SOCKET"
    log_info "Para sincronizar Edge Functions automáticamente:"
    echo "   1. Añade Mount en EasyPanel: /var/run/docker.sock → /var/run/docker.sock"
    echo "   2. Redespliega el CRM"
    exit 0
fi

# === Verificar directorio de funciones ===
if [ ! -d "$FUNCTIONS_SOURCE" ]; then
    log_error "No se encontró directorio de funciones: $FUNCTIONS_SOURCE"
    exit 1
fi

# === Obtener nombre del contenedor edge-runtime ===
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

# === Copiar funciones ===
log_info "Copiando funciones a $EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH..."

FUNCTIONS_COPIED=0
FUNCTIONS_FAILED=0

for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
    if [ -d "$fn_dir" ]; then
        fn_name=$(basename "$fn_dir")
        
        # Crear directorio destino si no existe
        docker exec "$EDGE_CONTAINER" mkdir -p "$EDGE_FUNCTIONS_PATH/$fn_name" 2>/dev/null || true
        
        # Copiar contenido de la función
        if docker cp "$fn_dir." "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/$fn_name/" 2>/dev/null; then
            log_success "Función copiada: $fn_name"
            ((FUNCTIONS_COPIED++))
        else
            log_error "Error copiando: $fn_name"
            ((FUNCTIONS_FAILED++))
        fi
    fi
done

# === Copiar archivos adicionales ===
for extra_file in "version.json" "import_map.json"; do
    if [ -f "$FUNCTIONS_SOURCE/$extra_file" ]; then
        if docker cp "$FUNCTIONS_SOURCE/$extra_file" "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/" 2>/dev/null; then
            log_info "Archivo copiado: $extra_file"
        fi
    fi
done

# === Crear función _main (healthcheck) ===
log_info "Creando función _main (healthcheck)..."
MAIN_FUNCTION='Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/_main/health" || url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("Edge Functions Ready", { status: 200 });
});'

# Crear archivo temporal y copiarlo
echo "$MAIN_FUNCTION" > /tmp/_main_index.ts
docker exec "$EDGE_CONTAINER" mkdir -p "$EDGE_FUNCTIONS_PATH/_main" 2>/dev/null || true
docker cp /tmp/_main_index.ts "$EDGE_CONTAINER:$EDGE_FUNCTIONS_PATH/_main/index.ts" 2>/dev/null
rm -f /tmp/_main_index.ts

echo ""
log_success "Funciones sincronizadas: $FUNCTIONS_COPIED copiadas, $FUNCTIONS_FAILED fallidas"

# === Listar funciones disponibles ===
echo ""
log_info "Funciones disponibles en edge-runtime:"
docker exec "$EDGE_CONTAINER" ls -1 "$EDGE_FUNCTIONS_PATH" 2>/dev/null | while read fn; do
    echo "   - $fn"
done

# === Reiniciar edge-runtime ===
echo ""
log_info "Reiniciando edge-runtime para aplicar cambios..."
if docker restart "$EDGE_CONTAINER" 2>/dev/null; then
    log_success "Contenedor reiniciado: $EDGE_CONTAINER"
    echo ""
    log_info "Las Edge Functions estarán disponibles en unos segundos"
else
    log_warn "No se pudo reiniciar el contenedor"
    log_info "Reinicia manualmente: docker restart $EDGE_CONTAINER"
fi

echo ""
echo "=========================================="
echo "  Sincronización completada"
echo "=========================================="
echo ""
