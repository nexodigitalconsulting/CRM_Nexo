# Dockerfile para CRM Web - Despliegue en Easypanel
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# --- Build-time config for Vite (Easypanel passes these as --build-arg) ---
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
# Optional: Basic Auth for self-hosted Supabase behind Kong proxy
ARG VITE_SUPABASE_BASIC_AUTH_USER
ARG VITE_SUPABASE_BASIC_AUTH_PASSWORD

# Make them available as env vars inside build container
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_SUPABASE_BASIC_AUTH_USER=${VITE_SUPABASE_BASIC_AUTH_USER}
ENV VITE_SUPABASE_BASIC_AUTH_PASSWORD=${VITE_SUPABASE_BASIC_AUTH_PASSWORD}

# Create .env so Vite can read them reliably at build-time
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env && \
    echo "VITE_SUPABASE_BASIC_AUTH_USER=${VITE_SUPABASE_BASIC_AUTH_USER}" >> .env && \
    echo "VITE_SUPABASE_BASIC_AUTH_PASSWORD=${VITE_SUPABASE_BASIC_AUTH_PASSWORD}" >> .env

# Safe debug + fail fast (do NOT print the key, only its length)
RUN echo "DEBUG_VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" && \
    echo "DEBUG_VITE_SUPABASE_ANON_KEY_LEN=$(echo -n ${VITE_SUPABASE_ANON_KEY} | wc -c)" && \
    test -n "${VITE_SUPABASE_URL}" || (echo "❌ Missing VITE_SUPABASE_URL" && exit 1) && \
    test -n "${VITE_SUPABASE_ANON_KEY}" || (echo "❌ Missing VITE_SUPABASE_ANON_KEY" && exit 1)

# Build
RUN npm run build

# Producción con Nginx
FROM docker.io/library/nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración Nginx para SPA
RUN echo 'server { \
    listen 80; \
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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
