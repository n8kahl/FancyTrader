import express from "express";

const mod = await import("./dist/index.js");
const every = Number(process.env.WORKER_EVERY_MS || 60000);
const app = express();
app.use(express.json());

async function runOnce(trigger = "loop", sessionOverride) {
  try {
    const out = await mod.main({ trigger, sessionOverride });
    console.log("[diag] main() returned", out ?? "");
    return { ok: true, out };
  } catch (e) {
    console.error("[diag] main() failed", e);
    return { ok: false, error: String(e) };
  }
}

app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/metrics", async (_req, res) => {
  if (typeof mod.getMetrics === "function") {
    res.type("text/plain").send(await mod.getMetrics());
  } else {
    res.type("text/plain").send("# no metrics");
  }
});

app.post("/run-now", async (req, res) => {
  const session = (req.query.session || req.body?.session || process.env.WORKER_FORCE_SESSION || "").toString() || undefined;
  const result = await runOnce("manual", session);
  res.status(result.ok ? 200 : 500).json(result);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log("[diag] web health listening on", port));

const oneshot = process.env.WORKER_ONESHOT === "1";
await runOnce("boot", process.env.WORKER_FORCE_SESSION);
if (oneshot) {
  console.log("[diag] oneshot complete, exiting");
  process.exit(0);
}
setInterval(() => runOnce("loop", process.env.WORKER_FORCE_SESSION), every);
