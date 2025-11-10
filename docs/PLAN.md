> ⚠️ **Deprecated (Superseded by `docs/AUTHORITATIVE_PLAN.md`)**
>
> This file is preserved for context only. The canonical roadmap lives in:
> **`docs/AUTHORITATIVE_PLAN.md`**.

## (Legacy) Sprint Plan (archived)

**Sprint 1 — Workspace alignment & build determinism**
Goal: Clean separation frontend/backend, single source of truth for configs, pinned deps, environment validation.

**Sprint 2 — Backend completion & hardening**
Goal: Fill in `...` placeholders, finalize REST/WS APIs, robust env, error handling, structured logs, rate limiting.

**Sprint 3 — Frontend completion**
Goal: Implement remaining UI, WS state handling, error/empty states, skeletons, feature toggles, integration with backend.

**Sprint 4 — Tests, Docs, CI/CD**
Goal: Unit/integration/E2E tests, coverage gates, READMEs & ops docs, GitHub Actions, Docker images.

**Optional Sprint 5 — Observability & production polish**
Goal: Metrics, tracing, dashboards, blue/green deploy, load/perf tests, SLOs and runbooks.

---

# PROMPT LIBRARY

> Use these prompts in order. Each block is intentionally explicit so Copilot/Codex can act deterministically.

---

## Sprint 1 — Architecture & Build

### 1.1 Create a proper monorepo/workspace

**Prompt:**
“@workspace Analyze the current repo tree. Propose a **pnpm workspaces** structure with:

- `apps/frontend` (React + Vite),
- `apps/backend` (Node/Express + ws),
- `packages/shared` (shared types, zod schemas).
  Then generate the following files (create/overwrite as needed) and explain each field:
- `pnpm-workspace.yaml`
- Root `package.json` with `workspaces`, `engines`, and scripts: `build`, `dev`, `lint`, `typecheck`, `test`, `format`.
- Root `.nvmrc` set to Node 20 LTS.
- Root `.editorconfig`, `.gitignore`.
  Move existing frontend code to `apps/frontend`, backend code to `apps/backend`, and create `packages/shared`. Update all import paths accordingly.”

### 1.2 Pin dependencies & dedupe

**Prompt:**
“Inspect `apps/frontend/package.json` and `apps/backend/package.json`.

- Remove Node core modules (`http`, `path`) from `dependencies`.
- Move server-only libs out of frontend.
- Replace any `*` semver with specific versions.
- Ensure `devDependencies` vs `dependencies` are correct.
- Ensure only one copy of `@vitejs/plugin-react-swc` as a devDependency in the frontend.
- Add scripts: `dev`, `build`, `preview` (frontend), and `dev`, `build`, `start` (backend).
  Explain all changes and why.”

### 1.3 Unify TypeScript & lint/format

**Prompt:**
“Create a root `tsconfig.base.json` and extend it from: `apps/frontend/tsconfig.json`, `apps/backend/tsconfig.json`, `packages/shared/tsconfig.json`.

- Strict TS everywhere, path aliases `@shared/*` → `packages/shared/src/*`.
  Also add:
- `.eslintrc.cjs` at root using `@typescript-eslint` + `eslint-config-prettier`.
- `.prettierrc` with sensible defaults.
- ESLint scripts in root and per-app.
  Finally, run autofixes across the workspace and show a summary of remaining lint issues.”

### 1.4 Single source of truth for Vite/Tailwind/PostCSS

**Prompt:**
“Remove duplicate Vite, Tailwind, and PostCSS configs. Keep only:

- `apps/frontend/vite.config.ts`
- `apps/frontend/tailwind.config.cjs`
- `apps/frontend/postcss.config.cjs`
  Align these configs to:
- Vite dev server port 5173,
- Base URL `/`,
- `outDir: dist`.
  Update `index.html` if needed. Delete superseded configs and update docs.”

### 1.5 Environment management (zod)

**Prompt:**
“Create `packages/shared/src/env.ts` that validates all environment variables with `zod`. It must export typed getters for:

- Backend: `PORT`, `NODE_ENV`, `POLYGON_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DISCORD_WEBHOOK_URL`, CORS origins, rate-limit config.
- Frontend: `VITE_BACKEND_URL`, feature flags.
  Implement `safeParse` with helpful startup errors. Wire this into `apps/backend/src/index.ts` and `apps/frontend/src/utils/env.ts`. Add `.env.example` files for both apps.”

**Acceptance criteria (Sprint 1)**

- Repo runs `pnpm i` cleanly.
- `pnpm -r build` passes.
- `pnpm -r lint` returns no errors.
- One Vite/Tailwind/PostCSS configuration.
- All env variables validated via `zod`.

---

## Sprint 2 — Backend Completion & Hardening

### 2.1 Backend server bootstrap (Express + ws)

**Prompt:**
“Open `apps/backend/src/index.ts`. Implement a production-ready Express server with:

- Helmet, compression, JSON limits, trust proxy.
- CORS allow-list from env with regex support for preview URLs.
- Health endpoints: `/healthz` (liveness), `/readyz` (readiness).
- REST routes mounted under `/api` (placeholders OK for now).
- WebSocket server at `/ws` using `ws`, with heartbeat/ping, backpressure handling, max payload size, and JSON schema validation for inbound messages.
  Use a `createServer(app)` HTTP server so ws and http share the port. Export a `start()` that returns a shutdown function.”

### 2.2 Dependency Injection & services

**Prompt:**
“Refactor to construct external clients in `index.ts` and inject them into routes/services:

- `PolygonClient` (REST)
- `PolygonStreamingService` (WS)
- `SupabaseService`
- `DiscordService`
  Define a `Context` interface in `packages/shared/src/context.ts` and pass it to routers and WS handlers. Prevent constructors from throwing at import time; surface misconfiguration in `/readyz`.”

### 2.3 Shared message schemas

**Prompt:**
“Create `packages/shared/src/schemas.ts` using `zod` to define and export:

- `PriceUpdate`, `SetupUpdate`, `WatchlistItem`, `OptionContract`, etc.
- `WSInbound` and `WSOutbound` discriminated unions (`type` + `payload`).
  Generate TypeScript types from these schemas and use them on both client and server. Validate at boundaries.”

### 2.4 Market/Options routes

**Prompt:**
“Implement the following Express routers under `/api`:

- `GET /market/status`
- `GET /market/snapshot/:symbol`
- `GET /options/chain/:symbol` with pagination/filters
- `POST /watchlist` {symbol}, `DELETE /watchlist/:symbol`
  All inputs validated by zod; all errors normalized as `{ error: { code, message } }`. Include rate limiting per route.”

### 2.5 Polygon streaming handler

**Prompt:**
“Implement `PolygonStreamingService` to:

- Connect to Polygon via WS, authenticate, resubscribe on reconnect, exponential backoff.
- Translate raw messages to `PriceUpdate`/`TradeUpdate` events (using shared schemas).
- Broadcast updates only to interested clients (basic topic/subscription filtering).
  Add metrics counters for connects, reconnects, drops.”

### 2.6 Structured logging & error policy

**Prompt:**
“Create a `logger` using `pino` with redact rules for secrets.

- Log each request with requestId.
- Centralize error handler (`app.use`) that maps ZodError, AxiosError, and generic errors to consistent JSON with correlation IDs.
- Include graceful shutdown (SIGTERM/SIGINT) with WS/client drain.”

**Acceptance criteria (Sprint 2)**

- `pnpm --filter backend build && pnpm start` runs clean with `/healthz` and `/readyz`.
- REST routes return mocked or live data.
- WS clients can connect and receive heartbeat + sample updates.
- No unhandled promise rejections; structured logs present.

---

## Sprint 3 — Frontend Completion

### 3.1 Backend client & WS hook

**Prompt:**
“Create `apps/frontend/src/services/apiClient.ts` using `fetch`/`axios` with: baseURL from env, JSON parsing, error normalization.
Create `apps/frontend/src/services/websocketClient.ts` with reconnect/backoff, ping handling, subscription API, and event emitters typed from `packages/shared/schemas`.
Create a React hook `useBackendConnection()` that exposes status, errors, and a subscribe method.”

### 3.2 UI flows & states

**Prompt:**
“Implement UI components and pages for:

- Market overview (market status + a few symbols)
- Watchlist management (add/remove, optimistic updates)
- Options chain viewer (filters, pagination)
- Strategy/Setup dashboard (server stream displayed live)
  Ensure loading, empty, error, and disconnected states. Add accessible semantics and keyboard navigation.”

### 3.3 Design system alignment

**Prompt:**
“Standardize the component library under `components/ui/*` with consistent props, a12y, and behavior. Add a `ThemeProvider`, CSS reset, and global styles. Introduce simple feature flags for demo vs live streams.”

**Acceptance criteria (Sprint 3)**

- App boots, connects to backend, renders market data and watchlist.
- UI shows proper skeletons/errors.
- No type errors; tree-shakeable, production build succeeds.

---

## Sprint 4 — Tests, Docs, CI/CD

### 4.1 Backend tests (Jest)

**Prompt:**
“Add Jest to `apps/backend` with `ts-jest`. Write tests for:

- `technicalIndicators` (RSI, EMA, MACD) with golden data.
- `strategyDetector` predicates (e.g., EMA alignment, RSI thresholds).
- `routes` using `supertest`: status, snapshot, options chain.
- WS handler: given inbound `A/T/Q` messages, assert emitted `WSOutbound` events.
  Add coverage thresholds: 80% lines/branches and fail build below that.”

### 4.2 Frontend tests (Vitest + React Testing Library)

**Prompt:**
“Configure Vitest for React + jsdom.
Write tests for:

- `useBackendConnection` (mock ws)
- `WatchlistManager` component (add/remove renders)
- `OptionsChain` table (filters/pagination)
  Snapshot tests for key components. Set coverage threshold to 80%.”

### 4.3 E2E tests (Playwright)

**Prompt:**
“Add Playwright in the root. Create a mock backend (or spin real backend) in `playwright.config`.
E2E: app loads, connects, shows market status, can add/remove watchlist items, and receives a simulated stream update.”

### 4.4 CI/CD with GitHub Actions

**Prompt:**
“Create `.github/workflows/ci.yml` that on PR and `main` branch runs:

- Setup pnpm + Node 20
- `pnpm i --frozen-lockfile`
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test -- --coverage`
- `pnpm -r build`
  Cache pnpm store and node_modules. Upload coverage artifact. Gate PRs on tests + coverage.”

### 4.5 Release, containers, and envs

**Prompt:**
“Add Dockerfiles for backend and frontend (multi-stage, non-root). Add `docker-compose.yml` for local integration.
Add `changeset` for versioning and a `release` workflow that tags + publishes containers to GHCR.
Update docs with deploy steps (Vercel for frontend, Railway/Fly/Docker/K8s for backend).”

### 4.6 Documentation set

**Prompt:**
“Create or update documentation files:

- `README.md` (quickstart, architecture, commands)
- `docs/ARCHITECTURE.md` (diagrams, data flow, WS protocol)
- `docs/OPERATIONS.md` (envs, scaling, health checks, rate limits, upgrade process)
- `docs/SECURITY.md` (secret management, CORS, input validation, logging redaction)
- `docs/TESTING.md` (unit/integration/E2E strategy)
  Include code snippets and command examples.”

**Acceptance criteria (Sprint 4)**

- CI is green; coverage ≥80%.
- Docker images build and run.
- Docs enable a new engineer to run everything in <15 minutes.

---

## Optional Sprint 5 — Observability & Production Polish

### 5.1 Metrics & tracing

**Prompt:**
“Instrument backend with Prometheus metrics for HTTP/WS (requests, latency, failures, reconnects). Add OpenTelemetry tracing with an OTLP exporter. Add `/metrics` endpoint guarded by IP allow-list or auth.”

### 5.2 Error tracking & SLOs

**Prompt:**
“Integrate Sentry (or similar) with release tagging and source maps. Define SLOs (availability, latency) and add alerting thresholds. Write `RUNBOOK.md` with triage steps.”

### 5.3 Performance & load

**Prompt:**
“Add k6/Gatling load tests focusing on WS fan-out and `options/chain` endpoints. Provide reports and tuning recommendations (pool sizing, backpressure thresholds, cache TTLs).”

---

# FILE-SPECIFIC “BUILD IT” PROMPTS

Use these when you’re ready to implement concrete files.

### Backend server entry

**Prompt:**
“Create or replace `apps/backend/src/index.ts` with: Express app, CORS via env allow-list, helmet, compression, request logging (pino http), zod-validated env, REST routes under `/api`, WS server at `/ws` with heartbeat/backpressure and zod-validated messages, health/readiness endpoints, graceful shutdown. Export `start()` and `stop()`; if this is a script, call `start()`.”

### WebSocket handler

**Prompt:**
“Implement `apps/backend/src/websocket/handler.ts` that accepts a `Context` (logger, services, pubsub).

- On `connection`, register heartbeat, parse inbound messages (`subscribe`, `unsubscribe`), update client subscriptions, and push filtered `WSOutbound` messages.
- Include backpressure: drop or buffer with a max queue size and log.
- Use shared `zod` schemas.”

### Polygon REST client (typed)

**Prompt:**
“Implement `apps/backend/src/services/polygonClient.ts` with a typed wrapper over Polygon REST endpoints used by our routes.

- Use axios with retry/backoff, per-route rate limits, and a circuit breaker.
- Map responses into our shared types (`Snapshot`, `OptionContract`).
- Unit tests with mocked HTTP.”

### Polygon streaming service

**Prompt:**
“Implement `apps/backend/src/services/polygonStreamingService.ts` that: connects to Polygon WS, authenticates, resubscribes after reconnect, converts raw messages to our `PriceUpdate`/`TradeUpdate`, and emits events. Include jittered backoff and metrics counters.”

### Shared schemas

**Prompt:**
“Create `packages/shared/src/schemas.ts` with zod schemas:
`WSOutbound = { type: "PRICE_UPDATE" | "SETUP_UPDATE" | ...; payload: ... }`,
`WSInbound = { type: "SUBSCRIBE" | "UNSUBSCRIBE"; payload: { symbols: string[] } }`,
`WatchlistItem`, `OptionContract`, `Snapshot`.
Export both zod schemas and inferred TS types.”

### Frontend WS client + hook

**Prompt:**
“Create `apps/frontend/src/services/websocketClient.ts` that exposes `connect({ url })`, `subscribe(symbols)`, `unsubscribe`, and an event listener API typed from shared schemas.
Then create `apps/frontend/src/hooks/useBackendConnection.ts` to manage connection lifecycle, reconnection, and a message dispatcher to app state.”

### Tests (backend)

**Prompt:**
“Add tests in `apps/backend/tests` for:

- indicators (`technicalIndicators.ts`): fixed inputs → expected outputs (include edge cases).
- routes with `supertest`: validate payload shape and error handling.
- ws handler: simulate messages and assert outbound events.”

### Tests (frontend)

**Prompt:**
“Add tests in `apps/frontend/src/__tests__`:

- `useBackendConnection` with a fake WS.
- `WatchlistManager` add/remove flows.
- `OptionsChain` filters/pagination.
  Use React Testing Library and Vitest.”

### CI workflow

**Prompt:**
“Create `.github/workflows/ci.yml` that: sets up pnpm, caches, runs `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test -- --coverage`, `pnpm -r build`. On main branch push, build and push Docker images to GHCR for backend and frontend tagged with git sha.”

---

# TEMPLATES YOU CAN ASK COPILOT TO WRITE

### Root `pnpm-workspace.yaml`

```
packages:
  - apps/*
  - packages/*
```

### Example root scripts (Copilot will fill details)

**Prompt:**
“Write a root `package.json` with scripts:

- `build`: `pnpm -r build`
- `dev`: `pnpm -r --parallel dev`
- `lint`: `pnpm -r lint`
- `typecheck`: `pnpm -r typecheck`
- `test`: `pnpm -r test`
- `format`: `prettier --write .`
  Add `engines: { node: \">=20 <21\" }` and `prettier` config reference.”

### Backend Dockerfile (multi-stage)

**Prompt:**
“Create `apps/backend/Dockerfile` multi-stage:

- builder: node:20-alpine → install pnpm, install deps with `--frozen-lockfile`, build
- runtime: node:20-alpine, create non-root user, copy dist and production deps, `CMD [\"node\",\"dist/index.js\"]`
  Expose port from env, set `NODE_ENV=production`.”

### Frontend Dockerfile

**Prompt:**
“Create `apps/frontend/Dockerfile` multi-stage:

- builder: node:20-alpine → build Vite to `/dist`
- runtime: nginx:alpine → copy `/dist` to `/usr/share/nginx/html`, add a minimal nginx.conf for SPA fallback.”

---

# BACKLOG / ACCEPTANCE CHECKLISTS

**Definition of Done (per feature)**

- Types complete and exported from `packages/shared`.
- Inputs validated with zod at boundaries.
- Errors standardized.
- Unit tests + integration tests added; coverage passes.
- Docs updated.
- Feature flags toggled in envs.

**Security checklist**

- No secrets in source; env only.
- CORS allow-list enforced; edge functions not `*`.
- Rate limits on external-facing routes.
- Logs redact tokens/keys.
- Dependencies pinned and audited.
  }
