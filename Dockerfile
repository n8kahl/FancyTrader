FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm -w --filter ./packages/shared build && pnpm -w --filter ./apps/frontend build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/apps/frontend/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
