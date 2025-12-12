#!/bin/bash
# ============================================
# Generador de Claves JWT para Supabase
# ============================================
# Uso: ./generate-keys.sh <JWT_SECRET>

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Generador de Claves JWT Supabase${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Verificar si se proporcionó JWT_SECRET
if [ -z "$1" ]; then
    # Generar JWT_SECRET aleatorio
    JWT_SECRET=$(openssl rand -base64 32)
    echo -e "${YELLOW}⚠️  No se proporcionó JWT_SECRET, generando uno aleatorio...${NC}"
else
    JWT_SECRET="$1"
fi

echo ""
echo -e "${GREEN}JWT_SECRET:${NC}"
echo "$JWT_SECRET"
echo ""

# Verificar que tenemos las herramientas necesarias
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl no está instalado${NC}"
    exit 1
fi

# Función para crear JWT
create_jwt() {
    local role=$1
    local secret=$2
    
    # Header
    local header='{"alg":"HS256","typ":"JWT"}'
    local header_base64=$(echo -n "$header" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
    
    # Payload - expira en 2050
    local exp=2524608000
    local payload='{"iss":"supabase","role":"'"$role"'","iat":1700000000,"exp":'"$exp"'}'
    local payload_base64=$(echo -n "$payload" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
    
    # Signature
    local signature=$(echo -n "${header_base64}.${payload_base64}" | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')
    
    echo "${header_base64}.${payload_base64}.${signature}"
}

# Generar claves
ANON_KEY=$(create_jwt "anon" "$JWT_SECRET")
SERVICE_ROLE_KEY=$(create_jwt "service_role" "$JWT_SECRET")

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Claves Generadas${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

echo -e "${YELLOW}ANON_KEY (clave pública):${NC}"
echo "$ANON_KEY"
echo ""

echo -e "${YELLOW}SERVICE_ROLE_KEY (clave privada - ⚠️ NO EXPONER):${NC}"
echo "$SERVICE_ROLE_KEY"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Archivo .env${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

cat << EOF
# Copia estas líneas a tu archivo .env

JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOF

echo ""
echo -e "${GREEN}✅ Claves generadas correctamente${NC}"
echo -e "${YELLOW}⚠️  Recuerda guardar estas claves de forma segura${NC}"
