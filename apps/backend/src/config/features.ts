import { serverEnv } from "@fancytrader/shared/server";

const boolFromEnv = (value: string | undefined, defaultValue: boolean): boolean => {
  if (typeof value !== "string") return defaultValue;
  const v = value.toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
};

const numberFromEnv = (value: string | undefined, defaultValue: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const featureFlags = {
  enablePolygonStream: false,
  enableMassiveStream: serverEnv.FEATURE_ENABLE_MASSIVE_STREAM,
  polygonBackoffOnMax: boolFromEnv(process.env.FEATURE_POLYGON_BACKOFF_ON_MAX, true),
  polygonMaxSleepMs: numberFromEnv(process.env.FEATURE_POLYGON_MAX_SLEEP_MS, FIFTEEN_MINUTES_MS),
  enableMockStream: boolFromEnv(process.env.FEATURE_ENABLE_MOCK_STREAM, false),
};

export type FeatureFlags = typeof featureFlags;
