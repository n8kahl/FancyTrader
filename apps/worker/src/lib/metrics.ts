import http from "node:http";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const scanSuccess = new Counter({
  name: "scan_success_total",
  help: "Successful scan jobs",
  labelNames: ["mode"] as const,
  registers: [registry],
});
export const scanFailure = new Counter({
  name: "scan_failure_total",
  help: "Failed scan jobs",
  labelNames: ["mode"] as const,
  registers: [registry],
});
export const jobsInflight = new Gauge({
  name: "jobs_inflight",
  help: "Currently running scan jobs",
  registers: [registry],
});
export const scanLatency = new Histogram({
  name: "scan_latency_ms",
  help: "Scan latency in milliseconds",
  buckets: [50, 100, 200, 400, 800, 1600, 3200, 6400],
  registers: [registry],
});

let server: http.Server | null = null;

export function startMetricsServer(port: number): http.Server | null {
  if (!port || port <= 0) {
    return null;
  }
  if (server) {
    return server;
  }

  const handler = async (_req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  };

  const s = http.createServer(handler);
  s.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.warn("[metrics] port in use, assuming already started on", port);
      server = s;
      return;
    }
    console.error("[metrics] server error:", err?.message || err);
  });

  try {
    s.listen(port, "0.0.0.0", () => {
      console.log("[metrics] listening on", port);
    });
    server = s;
  } catch (e: any) {
    if (e?.code === "EADDRINUSE") {
      console.warn("[metrics] port already in use on first listen; keeping existing server");
      server = s;
      return server;
    }
    console.error("[metrics] failed to listen:", e?.message || e);
  }

  return server;
}
