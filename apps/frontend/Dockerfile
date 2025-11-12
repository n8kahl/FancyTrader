FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
COPY tsconfig.base.json .
COPY tools tools

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

RUN pnpm --filter @fancytrader/shared build && \
    pnpm -w build:tokens && \
    pnpm --filter @fancytrader/frontend build

FROM nginx:alpine AS runtime

# Use a template so runtime PORT can be injected.
COPY --from=builder /app/apps/frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
RUN chmod -R 755 /usr/share/nginx/html

CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
