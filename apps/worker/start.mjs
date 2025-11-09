// ESM-safe bootstrap for the worker.
// - If $PORT is set (service treated as Web), expose a tiny /healthz.
// - Import the built worker and call main() immediately + on an interval.

import { createServer } from "node:http";

process.on("unhandledRejection", (e) => console.error("[diag] unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("[diag] uncaughtException", e));

const port = process.env.PORT;
if (port) {
  createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("worker");
  }).listen(Number(port), "0.0.0.0", () => {
    console.log("[diag] web health listening on", port);
  });
}

try {
  const mod = await import(new URL("./dist/index.js", import.meta.url));
  const every = Number(process.env.WORKER_EVERY_MS || 60000);
  console.log("[diag] env", {
    MASSIVE_API_KEY: !!process.env.MASSIVE_API_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    WORKER_SYMBOLS: process.env.WORKER_SYMBOLS || "SPY,QQQ",
    every,
  });
  const run = async () => {
    const t0 = Date.now();
    const base = process.env.MASSIVE_BASE_URL || "https://api.massive.com";
    const key = process.env.MASSIVE_API_KEY;
    let session = "unknown";
    try {
      const url = `${base}/v1/marketstatus/now`;
      let resp = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
      if ((resp.status === 401 || resp.status === 403) && key) {
        resp = await fetch(`${url}?apiKey=${encodeURIComponent(key)}`);
      }
      if (resp.ok) {
        const j = await resp.json();
        session = j?.earlyHours
          ? "premarket"
          : j?.afterHours
          ? "aftermarket"
          : j?.market === "open"
          ? "regular"
          : j?.market === "closed"
          ? "closed"
          : "unknown";
      } else {
        console.warn("[scan_run] status non-200", resp.status);
      }
    } catch (e) {
      console.warn("[scan_run] status fetch failed", e?.message || e);
    }

    let runError = null;
    try {
      await Promise.resolve(mod.main());
      console.log("[diag] main() returned");
    } catch (e) {
      console.error("[diag] main() failed", e);
      runError = e;
    }
    // --- heartbeat upsert (out-of-band observability, no worker code changes) ---
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;
      let session = "unknown";
      try {
        const base = process.env.MASSIVE_BASE_URL || "https://api.massive.com";
        const key = process.env.MASSIVE_API_KEY;
        const url = `${base}/v1/marketstatus/now`;
        let resp = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
        if ((resp.status === 401 || resp.status === 403) && key) {
          resp = await fetch(`${url}?apiKey=${encodeURIComponent(key)}`);
        }
        if (resp.ok) {
          const j = await resp.json();
          session = j?.earlyHours
            ? "premarket"
            : j?.afterHours
            ? "aftermarket"
            : j?.market === "open"
            ? "regular"
            : j?.market === "closed"
            ? "closed"
            : "unknown";
        } else {
          console.warn("[heartbeat] status fetch non-200", resp.status);
        }
      } catch (e) {
        console.warn("[heartbeat] status fetch failed", e?.message || e);
      }
      if (url && key) {
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const now = new Date().toISOString();
        const scanRow = {
          job_name: "scan_run",
          window_start: now,
          status: runError ? "failed" : "success",
          meta: {
            session,
            symbols: (process.env.WORKER_SYMBOLS || "SPY,QQQ").split(",").map((s) => s.trim()),
            duration_ms: Date.now() - t0,
            noop: session === "closed",
            source: "start.mjs",
          },
        };
        const { error: scanErr } = await sb.from("scan_jobs").upsert(scanRow, { onConflict: "job_name,window_start" });
        if (scanErr) console.error("[scan_run] upsert FAIL", scanErr.message);
        else console.log("[scan_run] upsert OK", now);
        const hbRow = {
          job_name: "heartbeat_worker",
          window_start: now,
          status: "success",
          meta: { source: "start.mjs", note: "post-main heartbeat", session },
        };
        const { error } = await sb.from("scan_jobs").upsert(hbRow, { onConflict: "job_name,window_start" });
        if (error) console.error("[heartbeat] upsert FAIL", error.message);
        else console.log("[heartbeat] upsert OK", now);
      } else {
        console.warn("[heartbeat] skipped: missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
      }
    } catch (e) {
      console.error("[heartbeat] error", e?.message || e);
    }
    // ---------------------------------------------------------------------------
  };
  run();
  setInterval(run, every);
} catch (e) {
  console.error("[diag] bootstrap failed", e);
  setTimeout(() => process.exit(1), 1000);
}
