# ---------- base ----------
FROM node:20-alpine AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ---------- builder ----------
FROM base AS builder
WORKDIR /app

# Copy only workspace manifests for better caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

# Bring in the full source and build shared + backend
COPY . .
RUN pnpm --filter ./packages/shared build \
  && pnpm --filter ./apps/backend build

# Produce a minimal runtime payload for the backend with pruned deps
RUN pnpm --filter ./apps/backend deploy --prod /app/runtime

# ---------- runner ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY --from=builder /app/runtime/ ./

ENV PORT=3001
EXPOSE 3001
USER nodeuser
CMD ["node","dist/index.js"]
