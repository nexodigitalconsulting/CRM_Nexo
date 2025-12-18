#!/bin/bash
# =============================================================================
# CRM Startup Script para Easypanel
# Ejecuta migraciones, sincroniza Edge Functions e inicia Nginx
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

echo ""
echo "=========================================="
echo "  CRM Web - Iniciando..."
echo "=========================================="
echo ""

# === 1. Ejecutar migraciones de base de datos ===
echo "--- Paso 1: Migraciones SQL ---"
if [ -n "$EXTERNAL_POSTGRES_HOST" ] && [ -n "$EXTERNAL_POSTGRES_PASSWORD" ]; then
    log_info "Ejecutando migraciones de base de datos..."
    if /app/easypanel/scripts/post-deploy.sh; then
        log_success "Migraciones completadas"
    else
        log_warn "post-deploy.sh falló, continuando..."
    fi
else
    log_warn "Variables de PostgreSQL no configuradas, saltando migraciones"
    log_info "Configura: EXTERNAL_POSTGRES_HOST, EXTERNAL_POSTGRES_PASSWORD"
fi

echo ""

# === 2. Sincronizar Edge Functions ===
echo "--- Paso 2: Edge Functions ---"
if [ -S "/var/run/docker.sock" ]; then
    if [ -x "/app/easypanel/scripts/sync-edge-functions.sh" ]; then
        /app/easypanel/scripts/sync-edge-functions.sh || {
            log_warn "sync-edge-functions.sh falló, continuando..."
        }
    else
        log_warn "sync-edge-functions.sh no encontrado o no ejecutable"
    fi
else
    log_warn "Docker socket no disponible"
    log_info "Para sincronizar Edge Functions automáticamente:"
    echo "   Añade Mount en EasyPanel: /var/run/docker.sock → /var/run/docker.sock"
fi

echo ""
echo "=========================================="
echo "  Paso 3: Iniciando Nginx..."
echo "=========================================="
echo ""

# Iniciar nginx en primer plano
exec nginx -g "daemon off;"
