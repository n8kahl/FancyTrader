FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_WS_URL
# Make Vite see these during build
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_BACKEND_WS_URL=${VITE_BACKEND_WS_URL}
COPY . .
RUN pnpm -w --filter ./packages/shared build \
 && pnpm -w --filter ./apps/frontend build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/apps/frontend/dist ./dist
# Railway supplies $PORT; default to 3000 locally
ENV PORT=3000
EXPOSE ${PORT}
# Bind to 0.0.0.0 and the injected $PORT
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:${PORT}"]
