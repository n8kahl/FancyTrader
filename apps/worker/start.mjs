import express from "express";
import * as promClient from "prom-client";
import { createClient } from "@supabase/supabase-js";
import { main as triggerRun } from "./dist/index.js";

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

function forcedSessionFromEnv() {
  const sessionEnv = process.env.WORKER_FORCE_SESSION?.toString().toLowerCase();
  if (sessionEnv === "open" || sessionEnv === "closed") {
    return sessionEnv;
  }
  return null;
}

function labels(opts = {}) {
  const forced = forcedSessionFromEnv();
  const sessionRaw = (opts.session ?? "").toString().toLowerCase();
  const detected = sessionRaw === "open" || sessionRaw === "closed" ? sessionRaw : null;
  const session = forced ?? detected ?? "unknown";
  const noop = Boolean(opts.noop);
  return { session, noop: String(noop) };
}

const log = (...a) => console.log(...a);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSvc = process.env.SUPABASE_SERVICE_KEY;
const sb =
  supabaseUrl && supabaseSvc
    ? createClient(supabaseUrl, supabaseSvc, { auth: { persistSession: false } })
    : null;

const runOnce = async (ctx = {}) => {
  const { session, noop } = labels(ctx);
  const runCtx = { ...ctx };
  if (session !== "unknown") {
    runCtx.forceSession = session;
  }

  const start = Date.now();
  jobsInflight.inc();
  let resultLabel = "success";
  let info = null;
  let durationMs = null;
  const reason = ctx.reason ?? "auto";
  try {
    info = await triggerRun(runCtx);
    scanSuccess.inc();
    scanRunsTotal.labels(session, noop, "success").inc();
    log("[diag] main() returned", { session, noop, reason });
    durationMs = Math.max(0, Math.round(Date.now() - start));
    if (sb) {
      const nowIso = new Date().toISOString();
      const metaPayload =
        info?.meta ?? {
          reason: info?.reason ?? reason ?? "auto",
          worker: "apps/worker",
        };

      const payload = {
        inserted_at: nowIso,
        window_start: nowIso,
        status: "success",
        session: String(info?.session ?? "unknown"),
        noop: String(info?.noop ?? "false") === "true",
        snapshot_backed: Boolean(info?.snapshot_backed ?? false),
        snapshot_count: Number.isFinite(info?.snapshot_count) ? info.snapshot_count : 0,
        duration_ms: durationMs,
        meta: metaPayload,
      };
      await sb
        .from("scan_runs")
        .insert(payload)
        .then(({ error }) => {
          if (error) {
            console.error("[scan_runs insert error]", error);
          }
        });
    }
  } catch (e) {
    resultLabel = "failure";
    durationMs = Math.max(0, Math.round(Date.now() - start));
    scanFailure.inc();
    scanRunsTotal.labels(session, noop, "failure").inc();
    console.error("[metrics] run failed", e);
  } finally {
    if (durationMs === null) {
      durationMs = Math.max(0, Math.round(Date.now() - start));
    }
    scanLatencyMs.labels(session, noop, resultLabel).observe(durationMs);
    jobsInflight.dec();
  }
};

const app = express();
app.use(express.json());
app.set("trust proxy", 1);

app.get("/healthz", (_req, res) => res.type("text/plain").send("ok"));

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", promClient.register.contentType);
    res.send(await promClient.register.metrics());
  } catch (e) {
    res.status(500).send(`# metrics error\n${e?.message || e}`);
  }
});

app.post("/run-now", (req, res) => {
  const sessionRaw = (
    req.query.session ?? req.body?.session ?? ""
  )
    .toString()
    .toLowerCase();
  const session = sessionRaw === "open" || sessionRaw === "closed" ? sessionRaw : "unknown";

  const noopRaw = (
    req.query.noop ?? req.body?.noop ?? ""
  )
    .toString()
    .toLowerCase();
  const noop = ["1", "true", "yes", "on"].includes(noopRaw);

  console.log("[run-now] received", { session, noop });

  res.json({ ok: true, accepted: true, session, noop, ts: new Date().toISOString() });

  queueMicrotask(() => {
    runOnce({ session, noop, reason: "manual" })
      .then(() => console.log("[run-now] completed", { session, noop }))
      .catch((e) => console.error("[run-now] error", e));
  });
});

const EVERY = Number(process.env.WORKER_EVERY_MS) || 60000;
const PORT = Number(process.env.PORT) || 8080;

void runOnce();
setInterval(() => {
  void runOnce();
}, EVERY);

app.listen(PORT, "0.0.0.0", () => {
  log("[diag] web listening", { PORT });
});
