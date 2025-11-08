const boolFromEnv = (value: string | undefined, defaultValue: boolean): boolean => {
  if (typeof value !== "string") {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return defaultValue;
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const rawPolygonFlag =
  process.env.FEATURE_ENABLE_POLYGON_STREAM ?? process.env.POLYGON_WS_ENABLED;

export const featureFlags = {
  enablePolygonStream: boolFromEnv(rawPolygonFlag, true),
  polygonBackoffOnMax: boolFromEnv(process.env.FEATURE_POLYGON_BACKOFF_ON_MAX, true),
  polygonMaxSleepMs: numberFromEnv(process.env.FEATURE_POLYGON_MAX_SLEEP_MS, FIFTEEN_MINUTES_MS),
  enableMockStream: boolFromEnv(process.env.FEATURE_ENABLE_MOCK_STREAM, false),
};

export type FeatureFlags = typeof featureFlags;
