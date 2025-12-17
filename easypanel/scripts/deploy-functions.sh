#!/bin/bash
# =============================================================================
# Deploy Edge Functions a Supabase Self-Hosted
# =============================================================================
# Este script copia las Edge Functions del CRM al volumen de Supabase
# para que el edge-runtime las ejecute.
#
# VARIABLES DE ENTORNO:
# - SUPABASE_FUNCTIONS_VOLUME: Ruta al volumen de funciones de Supabase
#   Ejemplo: /var/lib/easypanel/projects/supabase/volumes/functions
#
# =============================================================================

set -e

echo "=========================================="
echo "Deploy Edge Functions to Supabase"
echo "=========================================="
echo "Fecha: $(date)"
echo ""

# Configuración
SUPABASE_FUNCTIONS_VOLUME="${SUPABASE_FUNCTIONS_VOLUME:-}"
CRM_FUNCTIONS_DIR="${CRM_FUNCTIONS_DIR:-/app/supabase/functions}"
VERSION_FILE="$CRM_FUNCTIONS_DIR/version.json"

# Verificar que existe el directorio de funciones
if [ ! -d "$CRM_FUNCTIONS_DIR" ]; then
    echo "❌ Error: No se encontró el directorio de funciones"
    echo "   Esperado: $CRM_FUNCTIONS_DIR"
    exit 1
fi

# Verificar variable de entorno
if [ -z "$SUPABASE_FUNCTIONS_VOLUME" ]; then
    echo "⚠️  SUPABASE_FUNCTIONS_VOLUME no configurado"
    echo ""
    echo "   Para habilitar deploy de Edge Functions, configura:"
    echo "   SUPABASE_FUNCTIONS_VOLUME=/ruta/al/volumen/functions"
    echo ""
    echo "   Rutas típicas:"
    echo "   - Easypanel: /var/lib/easypanel/projects/{proyecto}/volumes/functions"
    echo "   - Docker Compose: ./volumes/functions"
    echo ""
    exit 0
fi

# Verificar que el volumen existe
if [ ! -d "$SUPABASE_FUNCTIONS_VOLUME" ]; then
    echo "❌ Error: El directorio de destino no existe"
    echo "   $SUPABASE_FUNCTIONS_VOLUME"
    echo ""
    echo "   Verifica que:"
    echo "   1. El volumen de Supabase está montado correctamente"
    echo "   2. La ruta SUPABASE_FUNCTIONS_VOLUME es correcta"
    exit 1
fi

# Mostrar versión de funciones
echo "1. Información de versión..."
if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE" | grep -o '"version"[^,]*' | cut -d'"' -f4)
    echo "   Versión: $VERSION"
else
    echo "   Versión: desconocida (version.json no encontrado)"
fi
echo ""

# Listar funciones a desplegar
echo "2. Funciones encontradas:"
FUNCTIONS_COUNT=0
for fn in "$CRM_FUNCTIONS_DIR"/*/; do
    if [ -d "$fn" ]; then
        fn_name=$(basename "$fn")
        if [ -f "$fn/index.ts" ]; then
            echo "   ✅ $fn_name"
            FUNCTIONS_COUNT=$((FUNCTIONS_COUNT + 1))
        else
            echo "   ⚠️  $fn_name (sin index.ts)"
        fi
    fi
done
echo ""
echo "   Total: $FUNCTIONS_COUNT funciones"
echo ""

# Crear backup si existe contenido previo
if [ "$(ls -A $SUPABASE_FUNCTIONS_VOLUME 2>/dev/null)" ]; then
    BACKUP_DIR="$SUPABASE_FUNCTIONS_VOLUME/.backup_$(date +%Y%m%d_%H%M%S)"
    echo "3. Creando backup en $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$SUPABASE_FUNCTIONS_VOLUME"/* "$BACKUP_DIR/" 2>/dev/null || true
    echo "   ✅ Backup creado"
else
    echo "3. No hay funciones previas, saltando backup..."
fi
echo ""

# Copiar funciones
echo "4. Copiando funciones..."
for fn in "$CRM_FUNCTIONS_DIR"/*/; do
    if [ -d "$fn" ]; then
        fn_name=$(basename "$fn")
        if [ -f "$fn/index.ts" ]; then
            echo "   → $fn_name"
            mkdir -p "$SUPABASE_FUNCTIONS_VOLUME/$fn_name"
            cp -r "$fn"/* "$SUPABASE_FUNCTIONS_VOLUME/$fn_name/"
        fi
    fi
done

# Copiar version.json si existe
if [ -f "$VERSION_FILE" ]; then
    cp "$VERSION_FILE" "$SUPABASE_FUNCTIONS_VOLUME/"
fi
echo ""

# Crear index para main (healthcheck del edge-runtime)
echo "5. Creando función main (healthcheck)..."
mkdir -p "$SUPABASE_FUNCTIONS_VOLUME/main"
cat > "$SUPABASE_FUNCTIONS_VOLUME/main/index.ts" << 'EOF'
// Edge Runtime healthcheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  
  return new Response(JSON.stringify({ 
    ok: true, 
    message: "Edge Functions Ready",
    timestamp: new Date().toISOString()
  }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  });
});
EOF
echo "   ✅ main/index.ts creado"
echo ""

# Resumen
echo "=========================================="
echo "✅ Edge Functions desplegadas"
echo "=========================================="
echo ""
echo "Funciones instaladas: $FUNCTIONS_COUNT"
echo "Destino: $SUPABASE_FUNCTIONS_VOLUME"
echo ""
echo "⚠️  IMPORTANTE: Para activar los cambios, reinicia el edge-runtime:"
echo ""
echo "   docker restart supabase-edge-functions"
echo ""
echo "   O desde Easypanel, reinicia el servicio 'edge-functions'"
echo ""
