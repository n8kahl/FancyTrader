# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_BACKEND_URL=http://localhost:3001
ARG VITE_BACKEND_WS_URL=ws://localhost:3001/ws
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BACKEND_WS_URL=$VITE_BACKEND_WS_URL
RUN pnpm --filter @fancytrader/shared build
RUN pnpm --filter @fancytrader/frontend build

FROM nginx:alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
