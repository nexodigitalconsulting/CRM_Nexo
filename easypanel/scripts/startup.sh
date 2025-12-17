#!/bin/bash
# =============================================================================
# CRM Startup Script para Easypanel
# Ejecuta migraciones y sincroniza Edge Functions antes de iniciar Nginx
# =============================================================================

set -e

echo "=========================================="
echo "CRM Web - Iniciando..."
echo "=========================================="

# === 1. Ejecutar migraciones de base de datos ===
if [ -n "$EXTERNAL_POSTGRES_HOST" ] && [ -n "$EXTERNAL_POSTGRES_PASSWORD" ]; then
    echo ""
    echo "1. Ejecutando migraciones de base de datos..."
    /app/easypanel/scripts/post-deploy.sh || {
        echo "⚠️  Advertencia: post-deploy.sh falló, continuando..."
    }
else
    echo ""
    echo "⚠️  Variables de PostgreSQL no configuradas, saltando migraciones"
fi

# === 2. Sincronizar Edge Functions ===
if [ -n "$SUPABASE_FUNCTIONS_VOLUME" ] && [ -d "$SUPABASE_FUNCTIONS_VOLUME" ]; then
    echo ""
    echo "2. Sincronizando Edge Functions..."
    
    if [ -d "/app/supabase/functions" ]; then
        # Copiar cada función
        for fn_dir in /app/supabase/functions/*/; do
            if [ -d "$fn_dir" ]; then
                fn_name=$(basename "$fn_dir")
                echo "   - Copiando función: $fn_name"
                mkdir -p "$SUPABASE_FUNCTIONS_VOLUME/$fn_name"
                cp -r "$fn_dir"* "$SUPABASE_FUNCTIONS_VOLUME/$fn_name/" 2>/dev/null || true
            fi
        done
        
        # Copiar version.json
        if [ -f "/app/supabase/functions/version.json" ]; then
            cp /app/supabase/functions/version.json "$SUPABASE_FUNCTIONS_VOLUME/"
        fi
        
        echo "✅ Edge Functions sincronizadas"
        echo ""
        echo "⚠️  IMPORTANTE: Reinicia el contenedor edge-runtime para aplicar cambios:"
        echo "   docker restart supabase-edge-functions"
    else
        echo "⚠️  No se encontró /app/supabase/functions"
    fi
else
    echo ""
    echo "ℹ️  SUPABASE_FUNCTIONS_VOLUME no configurado, Edge Functions no sincronizadas"
fi

echo ""
echo "=========================================="
echo "3. Iniciando Nginx..."
echo "=========================================="

# Iniciar nginx en primer plano
exec nginx -g "daemon off;"
