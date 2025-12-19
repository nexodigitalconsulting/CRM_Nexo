# Dockerfile para CRM Web - Despliegue en Easypanel
# =============================================================================
# Multi-stage build con soporte para migraciones y Edge Functions
# =============================================================================

# === Stage 1: Build de la aplicación ===
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install --no-audit --no-fund

# Copiar código fuente
COPY . .

# --- Build-time config for Vite (Easypanel passes these as --build-arg) ---
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Make them available as env vars inside build container
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Create .env so Vite can read them reliably at build-time
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env

# Safe debug + fail fast (do NOT print the key, only its length)
RUN echo "DEBUG_VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" && \
    echo "DEBUG_VITE_SUPABASE_ANON_KEY_LEN=$(echo -n ${VITE_SUPABASE_ANON_KEY} | wc -c)" && \
    test -n "${VITE_SUPABASE_URL}" || (echo "❌ Missing VITE_SUPABASE_URL" && exit 1) && \
    test -n "${VITE_SUPABASE_ANON_KEY}" || (echo "❌ Missing VITE_SUPABASE_ANON_KEY" && exit 1)

# Build
RUN npm run build

# === Stage 2: Producción con Nginx + PostgreSQL client + Docker CLI ===
FROM docker.io/library/nginx:alpine

# Instalar PostgreSQL client, bash, curl y Docker CLI para reiniciar edge-runtime
RUN apk add --no-cache postgresql-client bash curl docker-cli

# Copiar build de la aplicación
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar scripts de despliegue
COPY --from=builder /app/easypanel/scripts /app/easypanel/scripts
COPY --from=builder /app/easypanel/init-scripts /app/easypanel/init-scripts

# Copiar Edge Functions para sincronización
COPY --from=builder /app/supabase/functions /app/supabase/functions

# Hacer ejecutables los scripts
RUN chmod +x /app/easypanel/scripts/*.sh

# Configuración Nginx para SPA
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "OK"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

# Usar startup.sh que ejecuta migraciones + sincroniza funciones + inicia nginx
CMD ["/app/easypanel/scripts/startup.sh"]
