export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** expo backoff with full jitter (AWS style) */
export function expoBackoffJitter({
  attempt,
  minMs = 1_000,
  maxMs = 30_000,
  factor = 2,
}: {
  attempt: number; // 1-based
  minMs?: number;
  maxMs?: number;
  factor?: number;
}) {
  const base = Math.min(maxMs, minMs * Math.pow(factor, Math.max(0, attempt - 1)));
  // full jitter: random between 0..base
  return Math.floor(Math.random() * base);
}
