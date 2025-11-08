# Testing Guide

## Commands

| Target | Command |
|--------|---------|
| Backend unit/integration | `pnpm --filter @fancytrader/backend test -- --coverage` |
| Frontend unit tests      | `pnpm --filter @fancytrader/frontend test -- --coverage` |
| Shared package smoke     | `pnpm --filter @fancytrader/shared test -- --coverage` |
| Entire workspace         | `pnpm -r test -- --coverage` |
| Playwright E2E           | `pnpm e2e` |

Coverage thresholds are enforced at 80% lines/branches for backend and frontend (`jest.config.ts`, `vitest.config.ts`). The CI workflow fails if coverage drops or if any command above fails.

## Backend (Jest + Supertest + nock)

- Config lives in `apps/backend/jest.config.ts`. Tests run under Node with ts-jest.
- `.env.test` seeds required vars (fake Polygon key, ports, CORS allowlist) so constructors never read real secrets.
- REST integration tests (`tests/routes.market.test.ts`) call `createApp()` and use `supertest` + `nock` to stub Polygon endpoints (status, snapshots, options chain) with Massive Advanced data shapes.
- WebSocket logic is tested in isolation via a mock `WebSocketServer` and Polygon service stub (`tests/ws.handler.test.ts`), ensuring subscription bookkeeping and strategy broadcasts follow the shared schemas.
- Technical indicator math is covered with deterministic vectors (`tests/indicators.rsi.test.ts`).

## Frontend (Vitest + RTL + jsdom)

- Config lives in `apps/frontend/vitest.config.ts` and loads `src/setupTests.ts` (Jest DOM matchers).
- `useBackendConnection.test.tsx` mocks the WebSocket + REST clients to simulate connect/disconnect plus price/setup updates without touching the network.
- `WatchlistManager.test.tsx` covers optimistic add/remove flows, toast fallbacks, and API error handling by mocking `apiClient`.
- `OptionsChain.test.tsx` verifies filtering + pagination logic for the table component with deterministic `OptionsContract` fixtures.

## Playwright E2E

- Root `playwright.config.ts` starts the frontend dev server (Vite on port 5173) via `pnpm --filter @fancytrader/frontend dev`.
- `e2e/happy-path.spec.ts` intercepts `/api/*` calls, toggles mock mode, exercises the watchlist UI, and asserts that mock trades render. No live backend is required.

## Tips

- Run `pnpm -r lint` and `pnpm -r typecheck` before tests to catch obvious issues.
- Use `.env.test` as the canonical source for fake credentials. Never hardcode secrets in tests.
- To debug Jest locally, run `pnpm --filter @fancytrader/backend test -- --runInBand --watch`.
- To record Playwright traces, run `pnpm e2e -- --trace on`.
