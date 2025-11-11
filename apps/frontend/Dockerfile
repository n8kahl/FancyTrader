# --- builder stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Ensure pnpm via corepack
RUN corepack enable

# Copy workspace manifests needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

# Install deps
RUN pnpm install --frozen-lockfile

# Copy sources
COPY . .

# Optionally override backend URLs at build-time
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_WS_URL
ARG VITE_DEMO_USER_ID

# Build shared libs, tokens, and frontend
RUN pnpm --filter @fancytrader/shared build && \
    pnpm -w build:tokens && \
    pnpm --filter @fancytrader/frontend build

# --- runtime stage ---
FROM nginx:alpine AS runtime

# Copy nginx config + built SPA
COPY --from=builder /app/apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
