import type { NextFunction, Request, Response } from "express";

type Entry = {
  status: number;
  body: unknown;
  expiresAt: number;
};

const store = new Map<string, Entry>();

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const getTtlMs = (): number => parsePositiveNumber(process.env.IDEMPOTENCY_TTL_MS, 5 * 60 * 1000);

function sweep(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.header("x-idempotency-key");
  if (!key) {
    next();
    return;
  }

  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    res.status(cached.status).json(cached.body);
    return;
  }

  if (Math.random() < 0.01) {
    sweep(now);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const status = res.statusCode || 200;
    const expiresAt = Date.now() + getTtlMs();
    store.set(key, { status, body, expiresAt });
    return originalJson(body);
  };

  next();
}
