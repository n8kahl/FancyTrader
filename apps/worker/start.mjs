import http from "node:http";
import { URL } from "node:url";
import * as promClient from "prom-client";

promClient.collectDefaultMetrics();

const scanSuccess = new promClient.Counter({
  name: "scan_success_total",
  help: "Total successful scan runs",
});
const scanFailure = new promClient.Counter({
  name: "scan_failure_total",
  help: "Total failed scan runs",
});
const jobsInflight = new promClient.Gauge({
  name: "jobs_inflight",
  help: "Number of scan jobs currently executing",
});
const scanRunsTotal = new promClient.Counter({
  name: "scan_runs_total",
  help: "Scan runs by session/noop/result",
  labelNames: ["session", "noop", "result"],
});
const scanLatencyMs = new promClient.Histogram({
  name: "scan_latency_ms",
  help: "Latency of scan runs in milliseconds",
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000],
  labelNames: ["session", "noop", "result"],
});

function labels({ session = "unknown", noop = false } = {}) {
  return { session, noop: String(noop) };
}

const log = (...a) => console.log(...a);

const workerModPromise = import("./dist/index.js").catch((e) => {
  console.error("[diag] import failed", e);
  return null;
});

const EVERY = +process.env.WORKER_EVERY_MS || 60_000;
const PORT = +(process.env.PORT || 8080);

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

const run = async (ctx = {}) => {
  const m = await workerModPromise;
  if (!m?.main) {
    console.error("[metrics] run skipped -- worker module not ready");
    return;
  }
  const { session, noop } = labels(ctx);
  const start = Date.now();
  jobsInflight.inc();
  let resultLabel = "success";
  try {
    await m.main(ctx);
    scanSuccess.inc();
    scanRunsTotal.labels(session, noop, "success").inc();
    log("[diag] main() returned");
  } catch (e) {
    resultLabel = "failure";
    scanFailure.inc();
    scanRunsTotal.labels(session, noop, "failure").inc();
    console.error("[metrics] run failed", e);
  } finally {
    const durationMs = Date.now() - start;
    scanLatencyMs.labels(session, noop, resultLabel).observe(durationMs);
    jobsInflight.dec();
  }
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/run-now") {
      const rawSession = String(url.searchParams.get("session") ?? "").toLowerCase();
      const normalizedSession =
        rawSession === "open" || rawSession === "closed" ? rawSession : null;
      const session = normalizedSession ?? "unknown";

      const rawNoop = String(url.searchParams.get("noop") ?? "").toLowerCase();
      const noop =
        rawNoop === "true" ||
        rawNoop === "1" ||
        rawNoop === "yes" ||
        rawNoop === "y";

      json(res, 200, {
        ok: true,
        accepted: true,
        session,
        noop,
        ts: new Date().toISOString(),
      });

      const runCtx = { session, noop };
      if (normalizedSession) {
        runCtx.forceSession = normalizedSession;
      }
      void run(runCtx);
      return;
    }

    if (req.method === "GET" && url.pathname === "/metrics") {
      try {
        res.setHeader("Content-Type", promClient.register.contentType);
        res.end(await promClient.register.metrics());
      } catch (e) {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(`# metrics error\n${e?.message || e}`);
      }
      return;
    }

    json(res, 404, { error: "not_found" });
  } catch (e) {
    console.error("[server] error", e);
    json(res, 500, { error: "internal_error" });
  }
});

(async () => {
  const m = await workerModPromise;
  if (m?.main) {
    run();
    setInterval(run, EVERY);
  } else {
    console.warn("[diag] worker module not available yet");
  }
})();

server.listen(PORT, "0.0.0.0", () => log(`[diag] web health listening on ${PORT}`));
