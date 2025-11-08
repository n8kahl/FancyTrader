FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN corepack prepare pnpm@9.12.0 --activate \
  && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter ./packages/shared build \
  && pnpm --filter ./apps/backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/packages ./packages
EXPOSE 3001
CMD ["node","dist/index.js"]
