import { serverEnv } from "@fancytrader/shared/server";

const previewRegex = /^https:\/\/fancy-trader(-[a-z0-9-]+)?\.vercel\.app$/;

function parseAllowlist(): string[] {
  return (serverEnv.CORS_ALLOWLIST || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = parseAllowlist();
  if (allowed.length === 0) return true;
  return allowed.includes(origin) || previewRegex.test(origin);
}
