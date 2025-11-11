# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @fancytrader/shared build && \
    pnpm --filter @fancytrader/backend build

RUN pnpm prune --prod

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY --from=builder /app/packages/shared ./packages/shared

RUN chown -R node:node /app
USER node

RUN pnpm --filter @fancytrader/backend install --prod --frozen-lockfile

COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/readyz').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/backend/dist/index.js"]
