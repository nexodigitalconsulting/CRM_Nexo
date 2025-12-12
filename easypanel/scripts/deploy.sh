#!/bin/bash
# ============================================
# Script de Despliegue CRM en Easypanel
# ============================================
# Uso: ./deploy.sh [PROJECT_NAME]

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_NAME=${1:-"crm"}

echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║     CRM Stack - Despliegue Automático     ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. Verificar requisitos
# ============================================
echo -e "${YELLOW}[1/6] Verificando requisitos...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 no está instalado${NC}"
        exit 1
    fi
}

check_command docker
check_command docker-compose
check_command openssl

echo -e "${GREEN}✓ Requisitos verificados${NC}"

# ============================================
# 2. Crear estructura de directorios
# ============================================
echo -e "${YELLOW}[2/6] Creando estructura de directorios...${NC}"

mkdir -p ${PROJECT_NAME}/{crm-dist,functions,volumes/{postgres,storage,n8n}}
cd ${PROJECT_NAME}

echo -e "${GREEN}✓ Directorios creados${NC}"

# ============================================
# 3. Generar archivo .env
# ============================================
echo -e "${YELLOW}[3/6] Generando configuración...${NC}"

if [ ! -f ".env" ]; then
    # Generar secretos
    JWT_SECRET=$(openssl rand -base64 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')
    SECRET_KEY_BASE=$(openssl rand -base64 64)
    N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Generar JWT keys (simplificado)
    # En producción, usar el script generate-keys.sh
    ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiZXhwIjoyNTI0NjA4MDAwfQ.placeholder"
    SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJleHAiOjI1MjQ2MDgwMDB9.placeholder"
    
    cat > .env << EOF
# ============================================
# CRM Stack - Configuración Generada
# ============================================
# Generado el: $(date)

PROJECT_NAME=${PROJECT_NAME}
ORGANIZATION_NAME=Mi Empresa

# URLs (CAMBIAR POR TUS DOMINIOS)
SUPABASE_PUBLIC_URL=https://api.${PROJECT_NAME}.tudominio.com
API_EXTERNAL_URL=https://api.${PROJECT_NAME}.tudominio.com
SITE_URL=https://${PROJECT_NAME}.tudominio.com
ADDITIONAL_REDIRECT_URLS=https://${PROJECT_NAME}.tudominio.com/**
N8N_WEBHOOK_URL=https://n8n.${PROJECT_NAME}.tudominio.com
N8N_HOST=n8n.${PROJECT_NAME}.tudominio.com

# Puertos
POSTGRES_PORT=5432
STUDIO_PORT=3000
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
N8N_PORT=5678
CRM_PORT=80

# Base de datos
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_USER=postgres
POSTGRES_DB=postgres

# JWT & Seguridad
JWT_SECRET=${JWT_SECRET}
JWT_EXP=3600
SECRET_KEY_BASE=${SECRET_KEY_BASE}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

# Claves Supabase
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Email (configurar manualmente)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=admin@example.com

# Opciones
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
ENABLE_ANONYMOUS_USERS=false
TIMEZONE=Europe/Madrid
PGRST_DB_SCHEMAS=public,storage,graphql_public
EOF

    echo -e "${GREEN}✓ Archivo .env generado${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edita el archivo .env con tus dominios y credenciales SMTP${NC}"
else
    echo -e "${GREEN}✓ Archivo .env ya existe${NC}"
fi

# ============================================
# 4. Copiar archivos de configuración
# ============================================
echo -e "${YELLOW}[4/6] Copiando archivos de configuración...${NC}"

# Se asume que los archivos están en el directorio padre (easypanel/)
if [ -f "../docker-compose.yml" ]; then
    cp ../docker-compose.yml .
    cp -r ../init-scripts .
    cp -r ../kong .
    cp -r ../nginx .
    echo -e "${GREEN}✓ Archivos copiados${NC}"
else
    echo -e "${YELLOW}⚠️  Archivos de configuración no encontrados en ../easypanel/${NC}"
    echo -e "${YELLOW}   Por favor, copia manualmente docker-compose.yml, init-scripts/, kong/, nginx/${NC}"
fi

# ============================================
# 5. Construir CRM Web
# ============================================
echo -e "${YELLOW}[5/6] Preparando CRM Web...${NC}"

if [ -d "../../dist" ]; then
    cp -r ../../dist/* crm-dist/
    echo -e "${GREEN}✓ Archivos del CRM copiados${NC}"
else
    echo -e "${YELLOW}⚠️  No se encontró build del CRM (dist/)${NC}"
    echo -e "${YELLOW}   Ejecuta 'npm run build' en el proyecto CRM${NC}"
fi

# ============================================
# 6. Instrucciones finales
# ============================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ Preparación Completada          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo ""
echo "1. Edita el archivo .env con tus dominios y credenciales"
echo ""
echo "2. Genera las claves JWT correctas:"
echo "   ./scripts/generate-keys.sh"
echo ""
echo "3. Construye el CRM (si no lo has hecho):"
echo "   cd ../.. && npm run build && cp -r dist/* easypanel/${PROJECT_NAME}/crm-dist/"
echo ""
echo "4. Inicia los servicios:"
echo "   docker-compose up -d"
echo ""
echo "5. Verifica que todo funciona:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo ""
echo -e "${YELLOW}Para Easypanel:${NC}"
echo "1. Crea un nuevo proyecto en Easypanel"
echo "2. Añade servicio 'Docker Compose'"
echo "3. Pega el contenido de docker-compose.yml"
echo "4. Configura las variables de entorno desde .env"
echo "5. Configura los dominios para cada servicio"
echo "6. ¡Deploy!"
echo ""
echo -e "${GREEN}📚 Documentación: easypanel/DEPLOY.md${NC}"
