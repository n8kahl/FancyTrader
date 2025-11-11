# Operations Runbook

## Runtime summary

| Component | Default port | Entrypoint |
|-----------|--------------|------------|
| Backend (Express) | 3001 (`PORT`) | `pnpm --filter @fancytrader/backend start` |
| Frontend (Nginx)  | 80 | Nginx serving `/usr/share/nginx/html` |
| Worker (metrics)  | 9100 (`WORKER_METRICS_PORT`) | `pnpm --filter @fancytrader/worker start:loop` |

- `pnpm dev` runs backend + frontend in parallel for local development.
- `docker compose up --build` launches both images defined in the repo. The frontend image serves the static build behind nginx; the backend image runs `node apps/backend/dist/index.js`.

## Environment variables

### Canonical project-wide variables (set in Railway Project Variables)

`NODE_ENV`, `TRUST_PROXY`, `LOG_LEVEL`, `REQUEST_BODY_LIMIT`, `CORS_ALLOWLIST`, `MASSIVE_API_KEY`, `MASSIVE_BASE_URL`, `MASSIVE_WS_BASE`, `MASSIVE_WS_CLUSTER`, `FEATURE_ENABLE_MASSIVE_STREAM`, `FEATURE_MOCK_MODE`, `WS_MAX_PAYLOAD_BYTES`, `WS_HEARTBEAT_INTERVAL_MS`, `WS_IDLE_CLOSE_MS`, `WS_RECONNECT_MAX_ATTEMPTS`, `WS_RECONNECT_BASE_MS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_WRITE_MAX`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `DISCORD_ENABLED`, `DISCORD_WEBHOOK_URL`, `ADMIN_KEY`, `MIN_INSTANCES`, `MAX_INSTANCES`

### Per-service overrides

- Backend: `PORT=3001`
- Frontend: `VITE_BACKEND_URL`, `VITE_BACKEND_WS_URL`, `VITE_DEMO_USER_ID`
- Worker: `WORKER_SYMBOLS`, `WORKER_METRICS_PORT`

> Deprecated: `ALLOWED_WS_ORIGINS`, `CORS_ORIGINS`, `FRONTEND_ORIGINS`, `RATE_ENABLED`, `RATE_MAX`, `RATE_WINDOW_MS`.

Frontend-specific env (e.g., `VITE_BACKEND_URL`) live in `apps/frontend/src/utils/env.ts` and can be sourced from `.env`/`.env.local` per Vite conventions.

## Health & readiness

- `GET /healthz` returns `{ ok, version, uptimeSec }`.
- `GET /readyz` tracks Massive readiness (`SERVICE_STATE`), `lastMessageAt`, and stream freshness; `FEATURE_ENABLE_MASSIVE_STREAM=true` requires `MASSIVE_API_KEY`.
- `GET /metrics` exposes Prometheus counters (`utils/metrics`) and is protected by `x-admin-key: $ADMIN_KEY`.

## Middleware / CORS

- Helmet, compression, JSON/urlencoded parsers, request logging, and metrics middleware are installed in `createApp` before any router.
- Both HTTP and WS guards reference the same `CORS_ALLOWLIST` (comma-separated); preview deploys matching `https://fancy-trader-*.vercel.app` are allowed automatically.

## Rate limits & upstream safety

- Massive REST calls are wrapped with `followNextUrls` for safe pagination, `nock` stubs cover tests.
- The WebSocket handler tracks idle clients and unsubscribes symbols when the last subscriber disconnects.
- Alert polling cadence is controlled via watchlist size and can be tuned inside `alerts/evaluator`.
- Only a single process should have `STREAMING_ENABLED=true` **and** `FEATURE_ENABLE_MASSIVE_STREAM=true`. Preview builds or worker replicas should flip `STREAMING_ENABLED` off to avoid Massive's `max_connections` limit. When the limit is hit, the backend delays reconnects for `FEATURE_POLYGON_MAX_SLEEP_MS` (default 15 min).

## Logging & diagnostics

- `utils/logger.ts` (pino) logs structured messages (method, path, correlation-friendly data). In docker the output is JSON-ready for log aggregation.
- Each request increments HTTP counters via `incHttp`. Massive REST/WS calls also increment success/failure counters for dashboards.
- `DIAGNOSTICS_ENABLED` gate in the UI can surface mock data instructions when the backend is offline.

## Local build & Docker

1. Run `pnpm install` once, then `pnpm -r build` to compile shared, worker, backend, and frontend artifacts. This mirrors the multi-stage Docker flow.
2. Build each image locally with `docker build apps/backend -t fancytrader-backend` and `docker build apps/frontend -t fancytrader-frontend`; the Dockerfiles already install the workspace, compile everything, and copy the runtime artifacts (including the new shared/env binaries) into the final stage.
3. `docker compose up --build` still works (backend runs `node apps/backend/dist/index.js`, frontend serves `apps/frontend/build` via nginx) if you prefer a single command.

## Deployment workflow

1. Push / PR -> `.github/workflows/ci.yml` runs lint, typecheck, tests (with coverage), build.
2. Container builds use the new multi-stage Dockerfiles in `apps/backend` and `apps/frontend`; Railway should point each service at the appropriate Dockerfile and the corresponding `.env.example`.
3. `docker compose up --build` is the quickest way to validate a production-like stack locally.

## Troubleshooting checklist

- Backend refuses to start -> ensure `.env` has `POLYGON_API_KEY` (or switch UI to mock mode for demos).
- `readyz` failing -> Massive unreachable or `globalThis.__WSS_READY__` false (WS still booting). Check logs for `Failed to connect to Massive`.
- Frontend hitting wrong API -> set `VITE_BACKEND_URL` before building (Dockerfile exposes build args).
- Watchlist mutations in tests -> use provided route stubs or toggle mock mode to avoid real network calls.
