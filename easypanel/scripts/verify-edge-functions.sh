#!/bin/bash
# =============================================================================
# Verificación de Edge Functions
# Compara funciones del repositorio con las del volumen/contenedor
# =============================================================================

set -e

# Colores
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

# Configuración
FUNCTIONS_SOURCE="/app/supabase/functions"
SUPABASE_FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

echo ""
echo "=========================================="
echo "  Edge Functions - Verificación"
echo "=========================================="
echo ""

# === 1. Verificar funciones en repositorio ===
log_info "Funciones en el repositorio:"
REPO_FUNCTIONS=""
REPO_COUNT=0

if [ -d "$FUNCTIONS_SOURCE" ]; then
    for fn_dir in "$FUNCTIONS_SOURCE"/*/; do
        if [ -d "$fn_dir" ] && [ -f "$fn_dir/index.ts" ]; then
            fn_name=$(basename "$fn_dir")
            echo "   ✓ $fn_name"
            REPO_FUNCTIONS="$REPO_FUNCTIONS $fn_name"
            ((REPO_COUNT++)) || true
        fi
    done
    log_info "Total: $REPO_COUNT funciones"
else
    log_error "Directorio no encontrado: $FUNCTIONS_SOURCE"
fi

# === 2. Verificar volumen (si está configurado) ===
echo ""
if [ -n "$EDGE_FUNCTIONS_VOLUME" ] && [ -d "$EDGE_FUNCTIONS_VOLUME" ]; then
    log_info "Funciones en volumen ($EDGE_FUNCTIONS_VOLUME):"
    VOLUME_COUNT=0
    VOLUME_FUNCTIONS=""
    
    for fn_dir in "$EDGE_FUNCTIONS_VOLUME"/*/; do
        if [ -d "$fn_dir" ] && [ -f "$fn_dir/index.ts" ]; then
            fn_name=$(basename "$fn_dir")
            echo "   ✓ $fn_name"
            VOLUME_FUNCTIONS="$VOLUME_FUNCTIONS $fn_name"
            ((VOLUME_COUNT++)) || true
        fi
    done
    log_info "Total en volumen: $VOLUME_COUNT funciones"
    
    # Comparar
    echo ""
    MISSING=""
    for fn in $REPO_FUNCTIONS; do
        if ! echo "$VOLUME_FUNCTIONS" | grep -q "$fn"; then
            MISSING="$MISSING $fn"
        fi
    done
    
    if [ -z "$MISSING" ]; then
        log_success "Volumen sincronizado correctamente"
    else
        log_warn "Funciones faltantes en volumen:$MISSING"
    fi
else
    log_warn "EDGE_FUNCTIONS_VOLUME no configurado o no accesible"
fi

# === 3. Verificar endpoint ping ===
echo ""
if [ -n "$SUPABASE_URL" ]; then
    log_info "Verificando endpoint ping..."
    
    PING_URL="${SUPABASE_FUNCTIONS_URL}/ping"
    
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /tmp/ping_response.json -w "%{http_code}" "$PING_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "Ping OK (HTTP $HTTP_CODE)"
            
            # Mostrar respuesta
            if [ -f /tmp/ping_response.json ]; then
                RESPONSE=$(cat /tmp/ping_response.json)
                echo "   Respuesta: $RESPONSE"
                
                # Extraer versión si existe
                VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
                if [ -n "$VERSION" ]; then
                    log_info "Versión Edge Functions: $VERSION"
                fi
            fi
        else
            log_error "Ping falló (HTTP $HTTP_CODE)"
            if [ -f /tmp/ping_response.json ]; then
                echo "   Respuesta: $(cat /tmp/ping_response.json)"
            fi
        fi
        
        rm -f /tmp/ping_response.json
    else
        log_warn "curl no disponible para verificar endpoint"
    fi
else
    log_warn "SUPABASE_URL no configurado"
fi

# === 4. Verificar db-migrate ===
echo ""
if [ -n "$SUPABASE_URL" ]; then
    log_info "Verificando endpoint db-migrate..."
    
    MIGRATE_URL="${SUPABASE_FUNCTIONS_URL}/db-migrate"
    
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /tmp/migrate_response.json -w "%{http_code}" "$MIGRATE_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_success "db-migrate OK (HTTP $HTTP_CODE)"
            
            if [ -f /tmp/migrate_response.json ]; then
                RESPONSE=$(cat /tmp/migrate_response.json)
                
                # Extraer información
                DB_VERSION=$(echo "$RESPONSE" | grep -o '"dbVersion":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
                CODE_VERSION=$(echo "$RESPONSE" | grep -o '"codeVersion":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
                STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
                
                if [ -n "$DB_VERSION" ]; then
                    echo "   BD Version: $DB_VERSION"
                fi
                if [ -n "$CODE_VERSION" ]; then
                    echo "   Code Version: $CODE_VERSION"
                fi
                if [ -n "$STATUS" ]; then
                    echo "   Status: $STATUS"
                fi
            fi
        else
            log_error "db-migrate falló (HTTP $HTTP_CODE)"
        fi
        
        rm -f /tmp/migrate_response.json
    fi
fi

# === 5. Resumen ===
echo ""
echo "=========================================="
echo "  Resumen"
echo "=========================================="
echo ""

echo "Repositorio:    $REPO_COUNT funciones"

if [ -n "$VOLUME_COUNT" ]; then
    if [ "$VOLUME_COUNT" = "$REPO_COUNT" ]; then
        echo "Volumen:        ✅ Sincronizado ($VOLUME_COUNT funciones)"
    else
        echo "Volumen:        ⚠️ Desincronizado ($VOLUME_COUNT de $REPO_COUNT)"
    fi
else
    echo "Volumen:        ❓ No verificado"
fi

echo ""
log_info "Para sincronizar manualmente:"
echo "   /app/easypanel/scripts/sync-edge-functions.sh"
echo ""
