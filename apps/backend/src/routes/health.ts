import { Router } from "express";
import { getMarketStatusNow } from "../services/massiveStatus.js";
import { register } from "../utils/metrics.js";
import { requireAdminKey } from "../middleware/adminKey.js";
import { Config } from "../config.js";
import { serverEnv } from "@fancytrader/shared/server";

declare global {
  // populated by your WS server on ready
  // eslint-disable-next-line no-var
  var __WSS_READY__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __LAST_MSG_TS__: number | undefined;
}

const router = Router();

const version = process.env.npm_package_version ?? "0.0.0";
const FRESHNESS_THRESHOLD_MS = 90_000;

function getUptimeSec(): number {
  return Math.round(process.uptime());
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
router.get("/readyz", async (_req, res) => {
  const checks = {
    massiveKey: Boolean(serverEnv.MASSIVE_API_KEY),
    websocketReady: Boolean(globalThis.__WSS_READY__),
    restReachable: false,
    streamingEnabled: Config.massive.streamingEnabled,
    lastMessageAt: typeof globalThis.__LAST_MSG_TS__ === "number" ? globalThis.__LAST_MSG_TS__ : null,
    messageAgeSec: null as number | null,
    freshnessOk: false,
  };

  const now = Date.now();
  if (checks.lastMessageAt !== null) {
    const ageMs = Math.max(0, now - checks.lastMessageAt);
    checks.messageAgeSec = Math.round(ageMs / 1000);
    checks.freshnessOk = ageMs <= FRESHNESS_THRESHOLD_MS;
  }

  try {
    await getMarketStatusNow();
    checks.restReachable = true;
  } catch {
    checks.restReachable = false;
  }

  const ok = checks.websocketReady && checks.restReachable && checks.freshnessOk;
  res.status(200).json({ ok, checks });
});

/** Metrics (guarded) */
router.get("/metrics", requireAdminKey, async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

export { router as healthRouter };
