import rateLimit from "express-rate-limit";

const parsePositiveNumber = (value: string | number | undefined, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const getWindowMs = (): number => parsePositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const getAlertMax = (): number => parsePositiveNumber(process.env.RATE_LIMIT_MAX, 10);
const getShareMax = (): number => parsePositiveNumber(process.env.RATE_LIMIT_MAX, 5);

const sharedOptions = {
  windowMs: getWindowMs(),
  standardHeaders: true,
  legacyHeaders: false,
};

export const alertLimiter = rateLimit({
  ...sharedOptions,
  max: () => getAlertMax(),
  message: { error: "Rate limit exceeded for alerts endpoint" },
});

export const shareLimiter = rateLimit({
  ...sharedOptions,
  max: () => getShareMax(),
  message: { error: "Rate limit exceeded for share endpoint" },
});
