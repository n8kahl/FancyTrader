# Fancy Trader Architecture

## Monorepo layout

```
apps/
  backend/   # Express REST + WebSocket, Supabase + Polygon integrations
  frontend/  # React + Vite dashboard
packages/
  shared/    # zod schemas, shared contracts, env helpers
```

The workspace uses pnpm workspaces so every package consumes types and runtime helpers from `@fancytrader/shared`. Updating a schema automatically updates both the API and UI.

## Backend service

- **Runtime:** Node 20, Express 4, ws, pino.
- **Bootstrap:** `createApp` wires middleware, routers, metrics and error handling. `index.ts` hosts the HTTP + WebSocket server, broadcasts alerts, and starts the Polygon streaming service. Tests can import `createApp` without binding a port.
- **Routes:** `/api/market/*`, `/api/options/*`, `/api/watchlist/*`, `/api/backtest/*`, `/api/alerts`, `/api/share/*` etc. Every payload is validated with the shared zod schemas. `PolygonClient` owns REST calls (aggregates, snapshots, options chain) and `SupabaseService` persists setups/watchlists when Supabase creds are present.
- **Messaging:** `setupWebSocketHandler` tracks connected clients, manages Polygon subscriptions, handles pings, and emits `SETUP_UPDATE`, `ALERT`, `SUBSCRIPTIONS`, `STATUS`, and `ERROR` payloads shaped by `wsOutboundSchema`.
- **Schedulers:** `AlertEvaluator` polls Polygon snapshots for watched symbols and pushes `{ type: "alert" }` packets over the WebSocket broadcast helper.
- **Observability:** `metrics.ts` tracks HTTP + Polygon counters, `/healthz` exposes uptime/build info, `/readyz` asserts Polygon reachability and WebSocket readiness.

## Frontend application

- **Runtime:** React 18 + Vite (SWC), Tailwind-based UI primitives, lucide icons.
- **State:** `useBackendConnection` orchestrates REST hydration + WebSocket streaming, produces derived status flags, and keeps the trade list in sync with server updates.
- **Services:** `apiClient` centralizes fetch logic with zod validation and error normalization. `websocketClient` encapsulates reconnect/backoff/subscription logic using the shared WS schemas.
- **UI:** `WatchlistManager`, `OptionsContractSelector`, `OptionsChain` (filters/pagination), `MarketPhaseIndicator`, strategy cards, modals, etc.
- **Mock mode:** Toggle in the header swaps backend data with deterministic mock trades (used by manual demos and Playwright).

## Shared package

`packages/shared` houses all domain schemas: trades, confluence factors, WS inbound/outbound unions, alert conditions, plus env helpers. These schemas drive runtime validation on the API, TypeScript types in the UI, and dto tests.

## Data flow

1. **REST:** UI calls `apiClient.*` -> Express routes -> `PolygonClient`/`SupabaseService`. Payloads are validated on ingress and egress.
2. **WebSockets:** `websocketClient` emits `SUBSCRIBE`/`UNSUBSCRIBE`/`PING`. The backend validates, coordinates Polygon subscriptions via `PolygonStreamingService`, and broadcasts `wsOutboundSchema` payloads back to clients.
3. **Alerts:** `AlertEvaluator` polls stats/snapshots for watched symbols and sends `ALERT` payloads to every active WebSocket session.
4. **Options chain:** `/api/options/chain/:symbol` follows Polygon v3 pagination and maps raw rows into the shared `OptionContract` type, which feeds components like `OptionsChain`.

## External services

- **Polygon.io** (Massive Advanced Options/Indices plans) for REST + streaming data. REST calls are stubbed with `nock` in tests and the streaming service is mocked in `ws.handler.test.ts`.
- **Supabase** (optional) for setups/watchlist persistence. When env vars are missing the service degrades gracefully while keeping the same API contract.

This architecture keeps validation in one place, allows the API and UI to evolve independently, and makes reuse of shared contracts straightforward in tools, tests, or CLIs.
