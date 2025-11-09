import express from "express";
import pino from "pino";

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();
app.use(express.json());

let workerModPromise = import("./dist/index.js").catch((e) => {
  log.error({ err: e }, "[diag] import failed");
  return null;
});

const EVERY = +process.env.WORKER_EVERY_MS || 60_000;
const PORT = +(process.env.PORT || 8080);

app.get("/healthz", (_, res) => {
  res.type("text/plain").send("ok");
});

app.get("/metrics", async (req, res) => {
  try {
    const m = await workerModPromise;
    if (m?.metrics?.expose) {
      const text = await m.metrics.expose();
      res.type("text/plain").send(text);
    } else {
      res.status(404).type("text/plain").send("# no metrics");
    }
  } catch (e) {
    res.status(500).type("text/plain").send(`# metrics error: ${String(e)}`);
  }
});

app.post("/run-now", async (req, res) => {
  const session = (req.query.session || req.body?.session || "").toString() || undefined;
  res.json({ ok: true, accepted: true, session: session || null, ts: new Date().toISOString() });

  try {
    const m = await workerModPromise;
    if (!m?.main) {
      log.error("[run-now] worker module not ready");
      return;
    }
    Promise.resolve(m.main({ forceSession: session }))
      .then(() => log.info("[run-now] main() returned"))
      .catch((e) => log.error({ err: e }, "[run-now] main() failed"));
  } catch (e) {
    log.error({ err: e }, "[run-now] failed to start");
  }
});

app.get("/run-now", (req, res) => {
  req.method = "POST";
  app._router.handle(req, res);
});

(async () => {
  try {
    const m = await workerModPromise;
    if (!m?.main) {
      log.warn("[diag] worker module not available yet");
    } else {
      const run = () =>
        Promise.resolve(m.main())
          .then(() => log.info("[diag] main() returned"))
          .catch((e) => log.error({ err: e }, "[diag] main() failed"));
      run();
      setInterval(run, EVERY);
    }
  } catch (e) {
    log.error({ err: e }, "[diag] boot loop failed");
  }
})();

app.listen(PORT, "0.0.0.0", () => {
  log.info(`[diag] web health listening on ${PORT}`);
});
