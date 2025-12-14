# Dockerfile para CRM Web - Despliegue en Easypanel
# Usando mirrors públicos para evitar rate limiting de Docker Hub

# Opción 1: Usar registro público de Google (gcr.io) - sin rate limits
FROM gcr.io/distroless/nodejs20-debian12 AS node-base

# Builder stage usando imagen oficial con fully qualified name
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias con retry para mayor resiliencia
RUN npm ci --prefer-offline --no-audit || npm ci --prefer-offline --no-audit || npm ci

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

# Producción con Nginx - usando Quay.io mirror (Red Hat, sin rate limits)
FROM quay.io/nginx/nginx-unprivileged:alpine AS production

# Cambiar a root temporalmente para configurar
USER root

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración Nginx para SPA
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Asegurar permisos correctos
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Volver a usuario no privilegiado
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
