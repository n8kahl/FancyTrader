import { serverEnv } from "@fancytrader/shared/server";

function parseAllowlist(): string[] {
  return (serverEnv.CORS_ALLOWLIST || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "").toLowerCase();
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = parseAllowlist().map(normalizeOrigin).filter(Boolean);
  if (allowed.length === 0) return true;
  const normalized = normalizeOrigin(origin);
  return allowed.some((candidate) => normalized === candidate || normalized.startsWith(`${candidate}/`));
}
