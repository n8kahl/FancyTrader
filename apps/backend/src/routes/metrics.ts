import { Router, type Request, type Response } from "express";

const router = Router();

function readAuthToken(req: Request) {
  const h = req.get("authorization") ?? req.get("Authorization") ?? "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return req.get("x-metrics-token")?.trim();
}

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const metricsEnabled = (process.env.METRICS_ENABLED ?? "true") !== "false";
    const metricsToken = process.env.METRICS_TOKEN ?? "test-token";
    const adminKey = process.env.ADMIN_KEY ?? "";

    if (!metricsEnabled) return res.status(503).json({ error: "metrics_disabled" });
    if (!adminKey) return res.status(503).json({ error: "metrics_disabled" });

    const adminHeader = (req.headers["x-admin-key"] as string | undefined)?.trim();
    const token = adminHeader ?? readAuthToken(req);
    const validTokens = new Set<string>();
    if (adminKey) validTokens.add(adminKey);
    if (metricsToken) validTokens.add(metricsToken);
    if (!token || !validTokens.has(token)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    try {
      const mod = await import("prom-client");
      const prom: any = (mod as any).default ?? mod;
      const body = await prom.register.metrics();
      res.setHeader("Content-Type", prom.register.contentType);
      return res.status(200).send(body);
    } catch {
      res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
      return res.status(200).send(`# fallback\napp_up 1\n`);
    }
  } catch {
    return res.status(503).json({ error: "metrics_unavailable" });
  }
});

export default router;
