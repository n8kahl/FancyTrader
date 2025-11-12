import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

const enabled = process.env.METRICS_ENABLED === "true";
const token = process.env.METRICS_TOKEN ?? "";

let prom: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  prom = require("prom-client");
} catch {
  prom = null;
}

const getAuthToken = (req: Request) => {
  const header = req.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7);
  const x = req.get("x-metrics-token");
  return x ?? null;
};

router.get("/metrics", async (req: Request, res: Response) => {
  if (!enabled) return res.status(404).json({ error: "metrics_disabled" });

  const provided = getAuthToken(req);
  if (!provided || provided !== token) return res.status(401).json({ error: "unauthorized" });

  if (!prom?.register?.metrics) {
    return res.status(503).json({ error: "metrics_unavailable" });
  }

  try {
    const body = await prom.register.metrics();
    res.setHeader(
      "Content-Type",
      prom.register.contentType ?? "text/plain; version=0.0.4; charset=utf-8"
    );
    return res.status(200).send(body);
  } catch {
    return res.status(503).json({ error: "metrics_unavailable" });
  }
});

export default router;
