const parseAllowedOrigins = (): string[] =>
  (process.env.ALLOWED_WS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return true;
  return allowed.some((entry) => origin.startsWith(entry));
}
