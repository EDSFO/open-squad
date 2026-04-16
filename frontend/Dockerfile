# =============================================================================
# Opensquad Frontend - Production Dockerfile
# =============================================================================
# Multi-stage build for smaller production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 opensquad

# Copy built application
COPY --from=builder --chown=opensquad:nodejs /app/.next/standalone ./
COPY --from=builder --chown=opensquad:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=opensquad:nodejs /app/package.json ./package.json
COPY --from=builder --chown=opensquad:nodejs /app/next.config.mjs ./next.config.mjs

USER opensquad

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
