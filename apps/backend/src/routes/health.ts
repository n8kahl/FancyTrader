import { Router } from "express";
import axios from "axios";
import { metrics } from "../utils/metrics";
import { featureFlags } from "../config/features";
import type { PolygonServiceState } from "../services/polygonStreamingService";

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
const version = process.env.npm_package_version ?? "0.0.0";

function getUptimeSec(): number {
  return Math.round(process.uptime());
}

async function checkPolygonReachable(): Promise<boolean> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);
  try {
    await axios.get("https://api.polygon.io/v1/marketstatus/now", {
      params: { apiKey },
      signal: controller.signal,
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
    const polygonKey = streamingEnabled ? Boolean(process.env.POLYGON_API_KEY) : true;
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

router.get("/metrics", (_req, res): void => {
  // TODO: protect this endpoint in production
  res.json(metrics);
});

export { router as healthRouter };
