# =============================================================
# LiveTrigger AI - Production Multi-Stage Dockerfile
# =============================================================

# Stage 1: Build the Vite frontend
FROM node:22-alpine AS builder
WORKDIR /app

# Install native compilation dependencies for SQLite on Alpine
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install native build tools for SQLite compilation in alpine
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx && apk del python3 make g++

# Copy built frontend assets and server codebase
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Persistent volume directory for SQLite database, backups, and logs
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["tsx", "server.ts"]
