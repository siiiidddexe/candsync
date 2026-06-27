# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

# Install deps first (layer-cached unless package.json changes)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Production backend ──────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install only production backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy Vite build output → backend's public folder (served as static files)
COPY --from=frontend-builder /build/frontend/dist ./public

# Persistent storage directories (mounted as Docker volumes)
RUN mkdir -p /app/data /app/uploads

# ── Runtime defaults ──────────────────────────────────────────────────────────
ENV NODE_ENV=production \
    PORT=5000 \
    DB_PATH=/app/data/candsync.db

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
