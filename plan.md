# (Legacy) Plan Overview — Archived
This file has been superseded by **`docs/AUTHORITATIVE_PLAN.md`**.
Future updates should only change that document.

## Goals

Ship a production-ready stack with Massive.com data (Options Advanced + Indices Advanced) wired E2E, session-aware scanning (premarket/regular/aftermarket/closed), Supabase RLS-secured persistence, Railway workers for background scanners, robust reliability (retries/backoff/circuit breaker), secure/observable APIs, and a Figma-first frontend pipeline (tokens → CSS vars, Storybook visual/a11y checks).

## Scope by Workstream

### Massive Integration

- ✅ REST base switched to api.massive.com (done).
- Normalize market status; implement WS streaming with reconnection/backoff; contract tests & live smoke probes in staging.

### Session Awareness

- Backend /api/market/status normalization.
- Frontend SessionIndicator in header; guidance per session; polling + tests.

### Background Scanning (Railway)

- Worker app with premarket/aftermarket continuous scanning; closed-market snapshot scanning.
- Idempotent scan_jobs table; setups table; dedupe keys; metrics.

### Reliability, Security, Observability

- HTTP wrapper with timeouts, retries, jittered exponential backoff, circuit breaker.
- Prometheus metrics and /api/metrics guarded by ADMIN_KEY.
- WS origin checks, heartbeat, rate-limiting for write routes, structured logging redaction.

### Figma → Code

- packages/tokens (tokens.json → tokens.css + tokens.d.ts).
- Storybook + visual/a11y checks; mapping doc; optional tools/figma-sync.

## Delivery Plan (Sprints)

- **Sprint 1 — Session Awareness E2E (P0):** Market status normalization + header badge + tests.
- **Sprint 2 — Streaming (P0):** Massive WebSocket service with reconnection/backoff + tests.
- **Sprint 3 — Data & Workers (P0):** Supabase migrations (setups, scan_jobs), Railway worker, replace KV usage; tests (RLS/idempotency).
- **Sprint 4 — Reliability & Security (P0/P1):** HTTP wrapper + breaker, metrics endpoint, WS security, rate limits; tests.
- **Sprint 5 — Figma Pipeline (P1):** Tokens package, Storybook, visual/a11y checks, mapping doc; CI gates.

## Done-When (Acceptance Gates per Sprint)

- All new endpoints covered by unit/integration tests, min coverage backend ≥85%.
- Worker jobs idempotent; dashboards show RED/USE; /api/metrics guarded.
- UI displays session correctly; scanners behave per session.
- Storybook builds; visual/a11y checks pass; tokens consumed by components.

## Environments & Secrets

Env keys: MASSIVE_API_KEY, MASSIVE_BASE_URL, MASSIVE_WS_BASE, FEATURE_ENABLE_MASSIVE_STREAM, FEATURE_MOCK_MODE, SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_KEY, VITE_BACKEND_URL, VITE_BACKEND_WS_URL.

Staging first, then prod; gated by tests & manual approval.

## Risks & Mitigations

- **Rate Limits / Outages:** Circuit breaker + snapshot fallback; alerting.
- **Design Drift:** Tokens/Storybook diffs; approve/decline in PR.
- **RLS Issues:** Contract/RLS tests across users; audit logs.
