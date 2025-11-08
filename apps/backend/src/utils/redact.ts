const webhookPattern = /https?:\/\/(?:ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const longHexPattern = /\b[0-9a-f]{32,}\b/gi;

export function redactSecrets(input: string | undefined): string {
  if (!input) {
    return input ?? "";
  }

  return input
    .replace(webhookPattern, "[REDACTED_WEBHOOK]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(longHexPattern, "[REDACTED]");
}
