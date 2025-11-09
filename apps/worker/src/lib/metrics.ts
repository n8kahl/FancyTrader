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

export function startMetricsServer(port: number) {
  const server = http.createServer(async (_req, res) => {
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });
  server.listen(port, "0.0.0.0");
  return server;
}
