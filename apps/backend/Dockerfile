# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace manifests so pnpm can resolve deps without full sources
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY apps/worker/package.json apps/worker/

# Install ALL workspace deps (hoisted)
RUN pnpm install --frozen-lockfile

# Copy full source tree
COPY . .

# Build shared + backend
RUN pnpm -r build

# Prune dev deps for production
RUN pnpm prune --prod

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy runtime deps + built artifacts
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/readyz').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/backend/dist/index.js"]
