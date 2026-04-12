# ============================================================
# CRM Nexo v2.0 — Dockerfile multi-stage
# Stack: Next.js 15 App Router + Drizzle ORM + Better Auth
# Deploy: EasyPanel via GitHub (standalone output)
# ============================================================

# === Stage 1: Install dependencies ===
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --no-audit --no-fund

# === Stage 2: Build ===
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env vars (set in EasyPanel build args)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}
# Skip validation during build — runtime env provides real values
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV BETTER_AUTH_SECRET="build-placeholder-secret-not-used"

RUN npm run build

# === Stage 3: Production runtime ===
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone Next.js output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
