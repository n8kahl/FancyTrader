# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

# Install all deps (workspace)
RUN pnpm install --frozen-lockfile

# Copy full repo and build shared + backend
COPY . .
RUN pnpm --filter @fancytrader/shared build \
 && pnpm --filter @fancytrader/backend build

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable

# Only production deps for backend
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --filter @fancytrader/backend --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||'3001')+'/readyz').then(r=>r.json()).then(j=>j.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/backend/dist/index.js"]
