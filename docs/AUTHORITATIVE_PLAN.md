# Trading Coach (AI Copilot) — Authoritative Roadmap
**Status:** Authoritative. This document supersedes any older planning docs in this repo.

> Source of truth for scope, sequencing, and decisions. Everything here takes precedence over existing code and older docs.

## Vision
An AI “Trading Coach” that generates deterministic, risk-aware trade plans with confidence scoring, MTF (multi-timeframe) analysis, ATR/EMA-based stops/targets, MFE-driven runner extensions, and weekend/offline planning logic. Plans support options (incl. LEAPS), historical/backtesting (Polygon/fixtures for tests; Massive for live), and clear, structured outputs.

## Providers (Massive-first)
- **Live data:** Massive.com (Options Advanced + Indices Advanced)
- **Optional legacy:** Polygon **behind a feature flag** only (`FEATURE_POLYGON_ENABLED=false` by default)
- **Closed/Mock:** Snapshots fallback + `FEATURE_MOCK_MODE` for test/staging

## Product pillars
1. **Deterministic trade plans** with structured schema (`trade_detail`, `idea_url`, options contracts, extra take-profits incl. “leave runners”).
2. **Confluence engine** (MTF, ATR/EMA, probability-based TP scaling).
3. **Weekend/offline planning** using historical data + snapshots fallback.
4. **Confidence & rationale** surfaced to UI; Discord share.
5. **Typed contracts everywhere** (zod) and **fail-fast envs**.

---

## Sprints (P0 → P2)

### Sprint 0 (completed groundwork)
- Railway backend is up; healthz and session endpoints verified.
- Massive WS handshake + service state ok; local testing confirmed.
- Frontend builds and deploys; CORS/WS origin alignment done.

### Sprint 1 — Platform hardening (P0)
**Goals:** Typed envs, Massive-first gating, WS controls, snapshots writer, alerts coverage, CI guards.

**Scope**
- **Typed env schema** (server+client) with fail-fast (zod) and `.env.example` refresh.
- **Massive-first:** add `FEATURE_POLYGON_ENABLED` (default **false**), remove accidental Polygon paths when off.
- **WS limits:** `WS_MAX_PAYLOAD_BYTES`, `WS_HEARTBEAT_INTERVAL_MS`, `WS_IDLE_CLOSE_MS`.
- **Snapshots:** worker job to persist LKG (last-known-good) and read fallback when closed.
- **Discord alerts:** session transitions, scanner health, rate/circuit events, and trade lifecycle.
- **Security/DX:** `trust proxy`, request-id, log level; CI env guard + dep audit.

**Done when**
- Backend/worker boot fails on invalid env; Polygon never used when disabled.
- WS obeys env limits; idle cleanup works; oversize payloads rejected.
- `/api/snapshots?symbol=...` returns LKG in closed/premarket.
- CI gates: lint, typecheck, tests, build; dep audit runs.

### Sprint 2 — Strategy & plans (P0/P1)
**Goals:** Wire strategy detector to produce deterministic plans and confidence.
- Expand `StrategyDetector` to surface ATR/EMA stops/targets, MFE runners, and rationale.
- REST+WS schema for plans; UI surfacing + Discord share.
- RLS policies for new tables (setups/trades already in place); tests.

### Sprint 3 — Backtesting & weekend planner (P1)
**Goals:** Historical pipeline (offline/weekend) with fixtures + Massive backfill.
- Weekend runner (worker) to compile weekly breakout candidates (swings/LEAPS).
- Plan generator uses historical bars and snapshots; does not reduce confidence just because market is closed.
- Backtest harness; confidence calibration.

### Sprint 4 — Observability & polish (P1/P2)
**Goals:** Dashboards, alerts, runbooks; performance polish.
- RED/USE dashboards; alert rules for worker/backpressure/circuit.
- Cache/batch REST; connection pooling; rate shaping.
- Optional tracing (OTel).

---

## Architectural decisions (ADRs)
1. **Massive-first** provider with optional Polygon via `FEATURE_POLYGON_ENABLED` (default off).
2. **Snapshots fallback** required for closed/unstable provider windows.
3. **Strict contracts** (zod) across WS/REST; typed envs; fail-fast.
4. **Deterministic plans** with transparent rationale (confidence inputs visible).
5. **Security:** RLS everywhere; admin key for sensitive paths; CORS/WS allow-list.

---

## Deliverables checklists
- **Backend**
  - `/api/market/status`, `/api/snapshots`, `/api/trades`, `/api/plans`
  - WS: subscribe/unsubscribe; broadcast `ServerOutbound` types only
  - Metrics: Prom + health/readiness
- **Worker**
  - Scan jobs per session mode; snapshot persistence; Discord signals
- **Frontend**
  - Status banners per session; Watchlist; Active Trades; Plan detail; Share to Discord
  - Connection diagnostics; skeletons/empty/error states

---

## Status sync (2025-11-11)
- ✅ Sprint 0 groundwork: backend & worker running, health + readyz working, Massive handshake logged, frontend builds + shared contracts wired.
- 🔧 Frontend 404 => fixed by copying `apps/frontend/dist` into nginx + verifying SPA fallback (`try_files $uri $uri/ /index.html`).
- 🔄 Deprecated envs retired: `ALLOWED_WS_ORIGINS`, `CORS_ORIGINS`, `FRONTEND_ORIGINS`, `RATE_ENABLED`, `RATE_MAX`, `RATE_WINDOW_MS`.
- 📦 Documented canonical env list and release checklist across `.env.example`, `docs/OPERATIONS.md`, `README.md`.

## Environments (authoritative)
- `MASSIVE_API_KEY`, `MASSIVE_BASE_URL`, `MASSIVE_WS_BASE`, `MASSIVE_WS_CLUSTER`
- `FEATURE_ENABLE_MASSIVE_STREAM=true`
- `FEATURE_POLYGON_ENABLED=false` (optional legacy)
- `FEATURE_MOCK_MODE` (tests/staging)
- `WS_MAX_PAYLOAD_BYTES`, `WS_HEARTBEAT_INTERVAL_MS`, `WS_IDLE_CLOSE_MS`
- `CORS_ALLOWLIST`, `TRUST_PROXY`, `LOG_LEVEL`, `REQUEST_BODY_LIMIT`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `DISCORD_ENABLED`, `DISCORD_WEBHOOK_URL`, `DISCORD_*RETRY*`
- Frontend: `VITE_BACKEND_URL`, `VITE_BACKEND_WS_URL`, `VITE_DEMO_USER_ID`

---

## Test & acceptance
- ≥85% critical modules (env, ws handler, Massive client, trade/plan services)
- Worker snapshot job/retries covered; Discord sender retried/JIT
- WS env controls verified by tests (idle, payload cap)
- RLS policy tests for snapshots/trades/plans

---

## Runbooks
- Massive outage → use snapshots + mock mode (staging), alert, watch circuit gauge
- Rate limit breach → batch/shape; reduce cadence; monitor 429 counters
- Env drift → boot fails; correct envs per `.env.example`

---

## Backlog
- Full tracing (OTel), advanced backpressure strategies, broker abstraction for live orders (future)
