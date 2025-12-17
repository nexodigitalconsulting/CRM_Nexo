#!/bin/bash
# =============================================================================
# Verificación Completa de Deployment
# =============================================================================
# Verifica que todos los componentes del CRM estén correctamente desplegados.
#
# VARIABLES DE ENTORNO REQUERIDAS:
# - EXTERNAL_POSTGRES_HOST: Host de PostgreSQL
# - EXTERNAL_POSTGRES_PASSWORD: Contraseña de PostgreSQL
# - SUPABASE_URL: URL de la API de Supabase (opcional, para verificar Edge Functions)
#
# =============================================================================

set -e

echo "=========================================="
echo "Verificación de Deployment CRM"
echo "=========================================="
echo "Fecha: $(date)"
echo ""

ERRORS=0
WARNINGS=0

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; ERRORS=$((ERRORS + 1)); }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; WARNINGS=$((WARNINGS + 1)); }

# =============================================================================
# 1. Verificar conexión a PostgreSQL
# =============================================================================
echo "1. Base de Datos PostgreSQL"
echo "   ────────────────────────"

PGHOST="${EXTERNAL_POSTGRES_HOST:-}"
PGPORT="${EXTERNAL_POSTGRES_PORT:-5432}"
PGDATABASE="${EXTERNAL_POSTGRES_DB:-postgres}"
PGUSER="${EXTERNAL_POSTGRES_USER:-postgres}"
PGPASSWORD="${EXTERNAL_POSTGRES_PASSWORD:-}"

if [ -z "$PGHOST" ]; then
    warning "EXTERNAL_POSTGRES_HOST no configurado"
else
    export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD
    
    if psql -c "SELECT 1" > /dev/null 2>&1; then
        success "Conexión a PostgreSQL OK ($PGHOST:$PGPORT)"
        
        # Verificar schema_versions
        SCHEMA_VERSION=$(psql -t -c "SELECT COALESCE((SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1), 'none');" 2>/dev/null | tr -d ' ')
        if [ "$SCHEMA_VERSION" != "none" ] && [ -n "$SCHEMA_VERSION" ]; then
            success "Schema versión: $SCHEMA_VERSION"
        else
            error "Tabla schema_versions no encontrada o vacía"
        fi
        
        # Contar tablas
        TABLE_COUNT=$(psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')
        if [ "$TABLE_COUNT" -gt 10 ]; then
            success "Tablas encontradas: $TABLE_COUNT"
        else
            warning "Pocas tablas encontradas: $TABLE_COUNT (esperado: >25)"
        fi
        
        # Verificar tablas críticas
        CRITICAL_TABLES="profiles user_roles clients invoices contracts services"
        echo "   Tablas críticas:"
        for table in $CRITICAL_TABLES; do
            EXISTS=$(psql -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | tr -d ' ')
            if [ "$EXISTS" = "t" ]; then
                echo "      ✓ $table"
            else
                error "Tabla '$table' no existe"
            fi
        done
    else
        error "No se puede conectar a PostgreSQL"
    fi
fi
echo ""

# =============================================================================
# 2. Verificar Edge Functions
# =============================================================================
echo "2. Edge Functions"
echo "   ────────────────────────"

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

if [ -z "$SUPABASE_URL" ]; then
    warning "SUPABASE_URL no configurado - no se puede verificar Edge Functions"
else
    PING_URL="$SUPABASE_URL/functions/v1/ping"
    
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PING_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "200" ]; then
            success "Edge Functions disponibles (ping OK)"
            
            # Verificar respuesta
            RESPONSE=$(curl -s "$PING_URL" 2>/dev/null || echo "{}")
            if echo "$RESPONSE" | grep -q '"ok":true'; then
                VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
                if [ -n "$VERSION" ]; then
                    success "Versión de funciones: $VERSION"
                fi
            fi
        elif [ "$HTTP_CODE" = "000" ]; then
            error "No se puede conectar a Supabase ($SUPABASE_URL)"
        else
            warning "Edge Functions responden con HTTP $HTTP_CODE"
        fi
    else
        warning "curl no disponible - no se puede verificar Edge Functions"
    fi
fi
echo ""

# =============================================================================
# 3. Verificar archivos de funciones
# =============================================================================
echo "3. Archivos de Edge Functions"
echo "   ────────────────────────"

FUNCTIONS_DIR="/app/supabase/functions"
if [ -d "$FUNCTIONS_DIR" ]; then
    FN_COUNT=0
    for fn in "$FUNCTIONS_DIR"/*/; do
        if [ -d "$fn" ] && [ -f "$fn/index.ts" ]; then
            FN_COUNT=$((FN_COUNT + 1))
        fi
    done
    success "Funciones en código: $FN_COUNT"
    
    # Listar funciones
    echo "   Funciones disponibles:"
    for fn in "$FUNCTIONS_DIR"/*/; do
        if [ -d "$fn" ] && [ -f "$fn/index.ts" ]; then
            fn_name=$(basename "$fn")
            echo "      • $fn_name"
        fi
    done
else
    warning "Directorio de funciones no encontrado: $FUNCTIONS_DIR"
fi
echo ""

# =============================================================================
# 4. Verificar volumen de funciones (si está configurado)
# =============================================================================
echo "4. Volumen de Edge Functions"
echo "   ────────────────────────"

SUPABASE_FUNCTIONS_VOLUME="${SUPABASE_FUNCTIONS_VOLUME:-}"
if [ -z "$SUPABASE_FUNCTIONS_VOLUME" ]; then
    warning "SUPABASE_FUNCTIONS_VOLUME no configurado"
    echo "   Las funciones no se sincronizarán automáticamente"
elif [ -d "$SUPABASE_FUNCTIONS_VOLUME" ]; then
    success "Volumen accesible: $SUPABASE_FUNCTIONS_VOLUME"
    
    # Contar funciones en el volumen
    VOL_FN_COUNT=0
    for fn in "$SUPABASE_FUNCTIONS_VOLUME"/*/; do
        if [ -d "$fn" ] && [ -f "$fn/index.ts" ]; then
            VOL_FN_COUNT=$((VOL_FN_COUNT + 1))
        fi
    done
    echo "   Funciones desplegadas: $VOL_FN_COUNT"
    
    # Comparar con el código
    if [ "$VOL_FN_COUNT" -lt "$FN_COUNT" ]; then
        warning "Faltan funciones en el volumen (código: $FN_COUNT, volumen: $VOL_FN_COUNT)"
        echo "   Ejecuta: /app/easypanel/scripts/deploy-functions.sh"
    fi
else
    error "Volumen no accesible: $SUPABASE_FUNCTIONS_VOLUME"
fi
echo ""

# =============================================================================
# Resumen
# =============================================================================
echo "=========================================="
echo "RESUMEN"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Todo correcto - Deployment verificado${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS advertencias - Revisar configuración${NC}"
else
    echo -e "${RED}❌ $ERRORS errores, $WARNINGS advertencias${NC}"
fi

echo ""
echo "Errores: $ERRORS"
echo "Advertencias: $WARNINGS"
echo ""

exit $ERRORS
