# Security Notes

- **Metrics protection** – `/api/metrics` requires `x-admin-key: $ADMIN_KEY` (set via Railway vars).
- **Fail-fast config** – `@fancytrader/shared/server` enforces a Zod schema and exits in production if required values are missing (e.g., `MASSIVE_API_KEY` when streaming).
- **CORS & WS origins** – both HTTP and WS guards use the shared `CORS_ALLOWLIST`; allow only explicit origins (e.g., `https://fancy-trader-front.up.railway.app`). Wildcards such as `https://*.vercel.app` are not permitted.
- **Least-privilege workers** – the worker uses server-side Supabase service keys and `MASSIVE_API_KEY`; only the frontend receives `SUPABASE_ANON_KEY`.
- **No secrets in Vite builds** – treat any `VITE_*` variable as public client config; do not bake secrets into your frontend bundle.

If you discover a security issue, please file a private security advisory or email the maintainers directly.
