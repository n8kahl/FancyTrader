import { Router } from "express";
import axios from "axios";
import { register } from "../utils/metrics.js";
import { requireAdminKey } from "../middleware/adminKey.js";

declare global {
  // populated by your WS server on ready
  // eslint-disable-next-line no-var
  var __WSS_READY__: boolean | undefined;
}

const router = Router();

const MASSIVE_API_BASE = "https://api.massive.com";
const DEFAULT_USER_AGENT = process.env.HTTP_USER_AGENT ?? "FancyTrader-Backend/1.0";
const version = process.env.npm_package_version ?? "0.0.0";

function getUptimeSec(): number {
  return Math.round(process.uptime());
}

async function checkMassiveReachable(): Promise<boolean> {
  const apiKey = (process.env.MASSIVE_API_KEY || "").trim();
  if (!apiKey) return false;
  try {
    await axios.get(`${MASSIVE_API_BASE}/v1/marketstatus/now`, {
      params: { apiKey },
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Liveness */
router.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    version,
    time: Date.now(),
    uptimeSec: getUptimeSec(),
  });
});

/** Readiness */
router.get("/readyz", async (_req, res, next) => {
  try {
    const streamingEnabled = process.env.STREAMING_ENABLED === "true";
    const massiveKey = Boolean(process.env.MASSIVE_API_KEY);
    const websocketReady = streamingEnabled ? Boolean(globalThis.__WSS_READY__) : true;
    const restReachable = massiveKey ? await checkMassiveReachable() : false;

    const lastMsgTs = (globalThis as any).__LAST_MSG_TS__ as number | undefined;
    const now = Date.now();
    const msgAgeSec = lastMsgTs ? Math.floor((now - lastMsgTs) / 1000) : null;

    // Define "fresh enough" as <= 60s if streaming is required
    const streamFreshEnough = !streamingEnabled || (msgAgeSec !== null && msgAgeSec <= 60);

    const ok = (!streamingEnabled || websocketReady) && massiveKey && restReachable && streamFreshEnough;

    res.status(ok ? 200 : 503).json({
      ok,
      checks: {
        massiveKey,
        websocketReady,
        restReachable,
        streamingEnabled,
        lastMessageAt: lastMsgTs ?? null,
        messageAgeSec: msgAgeSec,
        freshnessOk: streamFreshEnough,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Metrics (guarded) */
router.get("/metrics", requireAdminKey, async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

export { router as healthRouter };
