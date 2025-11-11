# Operations Runbook

## Runtime summary

| Component | Default port | Entrypoint |
|-----------|--------------|------------|
| Backend (Express) | 3001 (set `PORT`) | `pnpm --filter @fancytrader/backend start` |
| Frontend (Vite)   | 5173              | `pnpm --filter @fancytrader/frontend dev` |

- `pnpm dev` runs backend + frontend in parallel for local development.
- `docker compose up --build` launches both images defined in the repo. The frontend image serves the static build behind nginx; the backend image runs `node apps/backend/dist/index.js`.

## Environment variables

Backend (`.env` / `.env.example`):

- `PORT` (default 8080, docker-compose sets 3001)
- `POLYGON_API_KEY`, `POLYGON_WS_CLUSTER`, `POLYGON_WS_BASE`, `POLYGON_FALLBACK_WS_BASE`
- `STREAMING_ENABLED` (set `false` on follower replicas so only one instance owns the Polygon stream)
- `FEATURE_ENABLE_POLYGON_STREAM`, `FEATURE_POLYGON_BACKOFF_ON_MAX`, `FEATURE_POLYGON_MAX_SLEEP_MS`, `FEATURE_ENABLE_MOCK_STREAM`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `DISCORD_WEBHOOK_URL`
- `FRONTEND_ORIGINS` or `CORS_ALLOWLIST` (comma separated)

Frontend (`.env`, `.env.test`):

- `VITE_BACKEND_URL`, `VITE_BACKEND_WS_URL` (defaults point to hosted API; override for docker or staging)

Tests load `.env.test` files automatically so secrets never leak into CI.

## Health & readiness

- `GET /healthz` returns `{ ok, version, uptimeSec }`.
- `GET /readyz` now includes the latest `SERVICE_STATE`. When `FEATURE_ENABLE_POLYGON_STREAM=true` and Polygon returns `max_connections`, readiness flips to `false` and the UI shows a "provider limit" banner.
- `GET /metrics` exposes the in-memory counters from `utils/metrics` (protect behind auth before exposing publicly).

## Middleware / CORS

- Helmet, compression, JSON/urlencoded parsers, request logging, and metrics middleware are installed in `createApp` before any router.
- CORS allowlist is composed of `FRONTEND_ORIGINS` + defaults (`https://fancy-trader.vercel.app`, `http://localhost:5173`) plus a regex for preview deploys. `CORS_ALLOWLIST` works as a shorthand for CLI usage.

## Rate limits & upstream safety

- Polygon REST calls are wrapped with `followNextUrls` for safe pagination, `nock` stubs cover tests.
- The WebSocket handler tracks idle clients and unsubscribes symbols when the last subscriber disconnects.
- Alert polling cadence is controlled via watchlist size and can be tuned inside `alerts/evaluator`.
- Only a single process should have `STREAMING_ENABLED=true` **and** `FEATURE_ENABLE_POLYGON_STREAM=true`. Preview builds or worker replicas should flip `STREAMING_ENABLED` off to avoid Polygon's `max_connections` limit. When the limit is hit, the backend delays reconnects for `FEATURE_POLYGON_MAX_SLEEP_MS` (default 15 min).

## Logging & diagnostics

- `utils/logger.ts` (pino) logs structured messages (method, path, correlation-friendly data). In docker the output is JSON-ready for log aggregation.
- Each request increments HTTP counters via `incHttp`. Polygon REST/WS calls also increment success/failure counters for dashboards.
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
- `readyz` failing -> Polygon unreachable or `globalThis.__WSS_READY__` false (WS still booting). Check logs for `Failed to connect to Polygon`.
- Frontend hitting wrong API -> set `VITE_BACKEND_URL` before building (Dockerfile exposes build args).
- Watchlist mutations in tests -> use provided route stubs or toggle mock mode to avoid real network calls.
