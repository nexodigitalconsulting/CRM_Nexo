# Dockerfile para CRM Web - Despliegue en Easypanel
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Variables para Vite (desde EASYPANEL ENV)
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Generar .env para Vite (build-time)
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env

# Validar que no estén vacías
RUN test -n "$VITE_SUPABASE_URL" || (echo "❌ Missing VITE_SUPABASE_URL" && cat .env && exit 1)
RUN test -n "$VITE_SUPABASE_ANON_KEY" || (echo "❌ Missing VITE_SUPABASE_ANON_KEY" && cat .env && exit 1)
RUN echo "✅ Variables OK: $(head -1 .env)"

# Build
RUN npm run build

# Producción con Nginx
FROM nginx:alpine

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
