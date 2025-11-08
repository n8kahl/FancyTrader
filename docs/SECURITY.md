# Security Notes

## Secrets & configuration

- Secrets are injected via environment variables only. Never commit `.env`; use `.env.example` as the template.
- The backend validates critical env vars at startup (`POLYGON_API_KEY`, Supabase credentials) and degrades gracefully for optional ones.
- `.env.test` files contain placeholder values so tests never reach live services.

## Network surface

- CORS is allowlist driven (`FRONTEND_ORIGINS` or `CORS_ALLOWLIST`). Preview deploys are matched via regex (`https://fancy-trader-*.vercel.app`). All other origins are rejected with a clear error.
- The WebSocket handler validates every inbound message with zod before mutating subscriptions and closes noisy clients after 60s of inactivity.
- REST calls to Polygon use axios timeouts and retry logic; Supabase calls are wrapped with schema validation before persisting data.

## Data handling

- Shared zod schemas ensure every object crossing package boundaries is validated. This prevents proto pollution and shields the UI from malformed upstream data.
- Watchlist mutations and setup deletions are normalized to uppercase symbols and sanitized before storage.
- Options chain responses are mapped into explicit objects (no direct pass-through of Polygon payloads).

## Logging & PII

- Pino logger avoids dumping request bodies by default. Secrets (API keys, Supabase keys) never appear in logged messages.
- Alert payloads and trade details stay in memory and over the WebSocket; persistent storage happens only inside Supabase if configured.

## Recommended hardening (production)

1. Put the backend behind a reverse proxy that terminates TLS and enforces rate limits per IP.
2. Lock down `/metrics` (basic auth or IP allowlist).
3. Configure Supabase policies so only expected service keys can mutate the relevant tables.
4. Rotate `POLYGON_API_KEY` regularly and store it in your secret manager (Vault, AWS Secrets Manager, Fly secrets, etc.).
5. Consider enabling request IDs and structured log shipping to detect anomalies.
