import { Router } from "express";
import { getMarketStatusNow } from "../services/massiveStatus.js";
import { register } from "../utils/metrics.js";
import { requireAdminKey } from "../middleware/adminKey.js";

declare global {
  // populated by your WS server on ready
  // eslint-disable-next-line no-var
  var __WSS_READY__: boolean | undefined;
}

const router = Router();

const version = process.env.npm_package_version ?? "0.0.0";

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
  try {
    const r = await getMarketStatusNow();
    res.status(200).json({ ok: true, upstream: !!r?.market });
  } catch (e: any) {
    res
      .status(503)
      .json({ ok: false, reason: "massive_marketstatus_failed", detail: e?.response?.status || String(e) });
  }
});

/** Metrics (guarded) */
router.get("/metrics", requireAdminKey, async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

export { router as healthRouter };
