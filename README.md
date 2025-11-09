# Fancy Trader Workspace

> Monorepo for the Fancy Trader backend (Express + ws), frontend (Vite + React), and shared zod contracts.

## Quickstart (5 minutes)

1. **Install tooling**
   - Node.js 20.x (use `.nvmrc`), [pnpm 9+](https://pnpm.io/installation).
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Configure environment**
   ```bash
   cp .env.example .env
   # fill in POLYGON_API_KEY and (optionally) DISCORD_WEBHOOK_URL
   ```
   The backend reads the same `.env` file (via `dotenv`) when you run dev or build.
4. **Run everything**
   ```bash
   pnpm --filter @fancytrader/backend dev   # http://localhost:${PORT:-8080}/api + ws
   pnpm --filter @fancytrader/frontend dev  # http://localhost:5173
   ```
   The frontend proxies API calls to the backend URL you configure in `apps/frontend/src/utils/env.ts` (default `http://localhost:8080`). Set `PORT=3001` in `.env` if you prefer to keep Vite on 5173 / backend on 3001.

### Scripts you’ll use most

| Area      | Command                                        | Notes |
|-----------|------------------------------------------------|-------|
| Backend   | `pnpm --filter @fancytrader/backend dev`       | `tsx watch src/index.ts`, hot reload + ws handler.
| Backend   | `pnpm --filter @fancytrader/backend build`     | `tsc` output in `apps/backend/dist`.
| Frontend  | `pnpm --filter @fancytrader/frontend dev`      | Vite dev server on 5173.
| Frontend  | `pnpm --filter @fancytrader/frontend test`     | Vitest unit tests.
| QA        | `pnpm e2e`                                     | Playwright happy path (spins up Vite dev server + stubbed API calls).
| All       | `pnpm lint` / `pnpm typecheck`                 | Workspace-wide lint / TS.

## Environment reference

| Variable               | Description |
|------------------------|-------------|
| `POLYGON_API_KEY`      | Required for both Polygon REST (v2/v3) + websockets.
| `POLYGON_WS_CLUSTER`   | One of `stocks`, `options`, `indices`, `forex`, `crypto`. Defaults to `options`.
| `POLYGON_WS_ENABLED`   | Legacy toggle for ws streaming (still honored, but prefer `FEATURE_ENABLE_POLYGON_STREAM`).
| `FEATURE_ENABLE_POLYGON_STREAM` | Master switch for Polygon WS ownership (disable in previews/CI to avoid consuming the real feed).
| `FEATURE_POLYGON_BACKOFF_ON_MAX` | When Polygon returns `max_connections`, wait before reconnecting (defaults to `true`).
| `FEATURE_POLYGON_MAX_SLEEP_MS` | Backoff duration in ms (default `900000`, i.e. 15 minutes).
| `FEATURE_ENABLE_MOCK_STREAM` | Emit mock heartbeats when the real feed is unavailable (off by default).
| `POLYGON_WS_BASE`      | (optional) Override realtime socket base (`wss://socket.polygon.io`).
| `POLYGON_FALLBACK_WS_BASE` | (optional) Delayed feed fallback (`wss://delayed.polygon.io`).
| `ALERT_POLL_MS`        | REST polling cadence for alert evaluator.
| `ALERT_COOLDOWN_MS`    | Minimum time between alert firings per rule.
| `PORT`                 | Backend HTTP/WS port (default 8080, sample `.env` uses 3001).
| `DISCORD_WEBHOOK_URL`  | Optional webhook to share trades/backtests.
| `ADMIN_KEY`           | Required for `/api/metrics` (header `x-admin-key`).
| `ALLOWED_WS_ORIGINS`  | Comma-separated websocket allowlist (defaults to allow all when blank).

Frontend-specific env (e.g., `VITE_BACKEND_URL`) live in `apps/frontend/src/utils/env.ts` and can be sourced from `.env`/`.env.local` per Vite conventions. See `.env.example` for defaults and `.env.test` for the deterministic values used by Jest/Vitest.

## Market session states

`/api/market/status` now normalizes the Massive market-status feed into four canonical sessions: **premarket**, **regular**, **aftermarket**, and **closed**. Each payload includes `nextOpen`, `nextClose`, the upstream `raw` body, and `source: "massive"`. The frontend polls this endpoint every 15 seconds and shows a header chip with contextual hints (e.g., premarket uses extended-hours data, closed falls back to cached snapshots). When mock mode is enabled, the indicator displays "Session: Mock" without hitting the backend.

## Polygon / Massive notes

- **REST v2 aggregates** – `/v2/aggs/ticker/:symbol/range/:mult/:timespan/:from/:to` powers the backtest runner and metrics. We keep `limit` < 50k and cap request windows.
- **REST v3 pagination** – Helpers in `apps/backend/src/utils/polygonPage.ts` follow `next_url` cursors (with backoff) so endpoints like `/v3/reference/options/contracts` return fully stitched responses.
- **WebSocket clusters** – `POLYGON_WS_CLUSTER` selects `/stocks`, `/options`, `/indices`, etc. We build channels accordingly (e.g., `T.O:SYMBOL` for options). If real-time auth fails, we automatically reconnect to `POLYGON_FALLBACK_WS_BASE` for delayed feeds.
- **Provider limits** – Hitting Polygon's `max_connections` flag puts the backend in a `SERVICE_STATE=degraded` mode. We broadcast that state to clients, optionally enable a mock feed, and delay reconnection by `FEATURE_POLYGON_MAX_SLEEP_MS` (default 15 min) so only one replica owns the live stream.

## Project layout

```
apps/
  backend/    # Express REST + ws + alert/backtest services
  frontend/   # Vite + React dashboard
packages/
  shared/     # zod schemas + client contracts
```

## Backtesting + alerts

- Run backtests via `/api/backtest/run` (see `docs/backtesting.md`).
- Share results or live trades to Discord with `/api/share/discord/*` endpoints.
- Create price alerts via `/api/alerts`; the evaluator polls Polygon snapshots every `ALERT_POLL_MS` ms and broadcasts `{ type: "ALERT" }` via the main WS feed.

## Massive/Polygon troubleshooting

1. **401 / auth_failed** – Ensure `POLYGON_API_KEY` is set. Options/indices streams require the right entitlements.
2. **429** – REST helper reads `retry-after` and backs off automatically; for WS you may need to reduce subscription counts.
3. **Delayed fallback** – Set `POLYGON_FALLBACK_WS_BASE=wss://delayed.polygon.io` to keep demo data flowing when real-time access is unavailable.

## Testing & quality gates

- `pnpm -r lint` and `pnpm -r typecheck` gate every PR.
- `pnpm -r test -- --coverage` runs Jest (backend), Vitest (frontend + shared), and enforces 80% line/branch coverage. Stub data lives in `.env.test` so no live services are touched.
- `pnpm e2e` starts the Vite dev server via Playwright's `webServer` hook and exercises the happy-path spec with mocked API routes.
- Coverage reports land in `apps/backend/coverage` and `apps/frontend/coverage` and are uploaded by CI.

## Docker & compose

```
docker compose up --build
```

- Backend image: multi-stage build under `apps/backend/Dockerfile` (Node 20 + pnpm, copies built `dist`). Exposes port 3001.
- Frontend image: `apps/frontend/Dockerfile` builds the Vite bundle and serves it via nginx with SPA fallback. Exposes port 80 (published as 5173).
- Override `VITE_BACKEND_URL` / `VITE_BACKEND_WS_URL` via build args or env vars when targeting staging clusters.

## CI/CD

- `.github/workflows/ci.yml` runs on every push/PR to `main`:
  1. checkout + setup pnpm/node 20
  2. `pnpm install --frozen-lockfile`
  3. `pnpm -r lint` → `pnpm -r typecheck` → `pnpm -r test -- --coverage` → `pnpm -r build`
  4. upload backend/frontend coverage artifacts
- Failing any of the commands above blocks the merge.

## Documentation

- `docs/ARCHITECTURE.md` – system overview, service boundaries, data flow.
- `docs/OPERATIONS.md` – ports, env vars, health checks, troubleshooting notes.
- `docs/SECURITY.md` – secrets, CORS, logging guidance.
- `docs/TESTING.md` – backend/frontend/Jest/Vitest/Playwright instructions.
- `docs/backtesting.md` – deep dive into the backtest subsystem.

Happy trading! 🎯
## Supabase setups & scan jobs

- **Schema:** `migrations/003_setups.sql` provisions the per-user `setups` table (RLS enforced via `auth.uid() = owner`) and `migrations/004_scan_jobs.sql` adds the idempotent `scan_jobs` log keyed by (`job_name`, `window_start`).
- **Backend service:** `apps/backend/src/services/supabaseSetups.ts` exposes `listSetups`, `saveSetup`, and `deleteSetup` so routes (and future workers) can persist setups without the legacy KV table. `GET /api/setups/history/:userId` now pulls from this table and `DELETE /api/setups/:setupId` accepts `x-user-id`/`userId` to scope deletions.
- **Worker:** `apps/worker` reuses the Massive REST client, polls `/v1/marketstatus/now`, and scans `WORKER_SYMBOLS` every loop. Results are recorded in `scan_jobs` with `onConflict: job_name,window_start`, so retries simply bump the row instead of duplicating work.
- **Running:**
  - Local dev: `pnpm --filter @fancytrader/worker dev` (or `build && start`).
  - Railway/cron: run `node dist/index.js` on your desired schedule (e.g., every 1 min during pre/regular/after sessions, every 5–10 min when closed).
- **Configuration:** Worker instances share the backend’s `MASSIVE_API_KEY`, optional `MASSIVE_BASE_URL`, and Supabase credentials plus `WORKER_SYMBOLS` to define the watchlist (default `AAPL,MSFT`).
