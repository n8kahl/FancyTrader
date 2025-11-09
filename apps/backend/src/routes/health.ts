import { Router } from "express";
import axios from "axios";
import { metrics } from "../utils/metrics";
import { featureFlags } from "../config/features";
import type { PolygonServiceState } from "../services/polygonStreamingService";
import { requireAdminKey } from "../middleware/adminKey";

declare global {
  var __WSS_READY__: boolean | undefined;
  var __POLYGON_STATE__: PolygonServiceState | undefined;
}

interface HealthResponse {
  ok: boolean;
  version: string;
  time: number;
  uptimeSec: number;
}

interface ReadyChecks {
  polygonKey: boolean;
  websocketReady: boolean;
  restReachable: boolean;
  serviceState: PolygonServiceState | null;
  streamingEnabled: boolean;
}

interface ReadyResponse {
  ok: boolean;
  checks: ReadyChecks;
}

const router = Router();
const MASSIVE_API_BASE = "https://api.massive.com";
const DEFAULT_USER_AGENT = process.env.HTTP_USER_AGENT ?? "FancyTrader-Backend/1.0";
const version = process.env.npm_package_version ?? "0.0.0";

function getUptimeSec(): number {
  return Math.round(process.uptime());
}

async function checkPolygonReachable(): Promise<boolean> {
  const apiKey = process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY;
  if (!apiKey) return false;

  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await axios.get(`${MASSIVE_API_BASE}/v1/marketstatus/now`, {
      params: { apiKey },
      signal: controller.signal,
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      timeout: timeoutMs,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/healthz", (_req, res): void => {
  const payload: HealthResponse = {
    ok: true,
    version,
    time: Date.now(),
    uptimeSec: getUptimeSec(),
  };
  res.json(payload);
});

router.get("/readyz", async (_req, res, next): Promise<void> => {
  try {
    const streamingEnabled = featureFlags.enablePolygonStream;
    const polygonKey = streamingEnabled ? Boolean(process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY) : true;
    const websocketReady = streamingEnabled ? Boolean(globalThis.__WSS_READY__) : true;
    const restReachable = streamingEnabled && polygonKey ? await checkPolygonReachable() : true;
    const serviceState = globalThis.__POLYGON_STATE__ ?? null;
    const degraded = streamingEnabled && serviceState?.reason === "max_connections";
    const response: ReadyResponse = {
      ok: streamingEnabled
        ? polygonKey && websocketReady && restReachable && !degraded
        : true,
      checks: { polygonKey, websocketReady, restReachable, serviceState, streamingEnabled },
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/metrics", requireAdminKey, (_req, res): void => {
  res.json(metrics);
});

export { router as healthRouter };
