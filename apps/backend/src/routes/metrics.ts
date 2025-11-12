import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

const enabled = process.env.METRICS_ENABLED !== "false";
const token = process.env.METRICS_TOKEN || "test-token";

let prom: any = null;
try {
  prom = require("prom-client");
} catch {
  prom = null;
}

function getAuthToken(req: Request) {
  const h = req.get("authorization");
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7);
  return req.get("x-metrics-token") ?? null;
}

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    if (!enabled) return res.status(404).json({ error: "metrics_disabled" });

    const provided = getAuthToken(req);
    if (!provided || provided !== token) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!prom?.register?.metrics) {
      return res.status(503).json({ error: "metrics_unavailable" });
    }

    const body = await prom.register.metrics();
    res.setHeader(
      "Content-Type",
      prom.register.contentType || "text/plain; version=0.0.4; charset=utf-8"
    );
    return res.status(200).send(body);
  } catch {
    return res.status(503).json({ error: "metrics_unavailable" });
  }
});

export default router;
