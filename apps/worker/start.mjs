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

const normalizeSession = (j) =>
  j?.earlyHours
    ? "premarket"
    : j?.afterHours
    ? "aftermarket"
    : j?.market === "open"
    ? "regular"
    : j?.market === "closed"
    ? "closed"
    : "unknown";

async function readSession() {
  const forced = (process.env.WORKER_FORCE_SESSION || "").trim().toLowerCase();
  if (["premarket", "regular", "aftermarket", "closed"].includes(forced)) {
    return forced;
  }
  const base = process.env.MASSIVE_BASE_URL || "https://api.massive.com";
  const key = process.env.MASSIVE_API_KEY;
  const url = `${base}/v1/marketstatus/now`;
  try {
    let resp = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
    if ((resp.status === 401 || resp.status === 403) && key) {
      resp = await fetch(`${url}?apiKey=${encodeURIComponent(key)}`);
    }
    if (!resp.ok) {
      console.warn("[session] non-200", resp.status);
      return "unknown";
    }
    return normalizeSession(await resp.json());
  } catch (e) {
    console.warn("[session] fetch failed", e?.message || e);
    return "unknown";
  }
}

async function writeSnapshotsIfActive(session, symbols) {
  if (session === "closed" || !symbols.length) {
    return { session, wrote: 0 };
  }
  try {
    // Import from the built package entry for production containers.
    const shared = await import("@fancytrader/shared");
    const { MassiveClient, PolygonClient, getSnapshotForSymbol } = shared;
    console.log("[diag] shared exports", Object.keys(shared));
    if (typeof getSnapshotForSymbol !== "function") {
      console.warn("[snapshots] helper missing");
      return { session, wrote: 0 };
    }
    const Client = MassiveClient || PolygonClient;
    if (!Client) {
      console.warn("[snapshots] no client available");
      return { session, wrote: 0 };
    }
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;
    if (!(sbUrl && sbKey)) {
      console.warn("[snapshots] writer skipped: supabase env missing");
      return { session, wrote: 0 };
    }
    const client = new Client({
      apiKey: process.env.MASSIVE_API_KEY,
      baseUrl: process.env.MASSIVE_BASE_URL,
    });
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    let wrote = 0;
    for (const symbol of symbols) {
      try {
        const data = await getSnapshotForSymbol(client, symbol);
        if (!data) continue;
        const row = {
          symbol,
          asof: new Date().toISOString(),
          data,
          source: "massive",
        };
        const { error } = await sb.from("snapshots").upsert(row, { onConflict: "symbol" });
        if (!error) {
          wrote++;
          console.log("[snapshots] upsert OK", symbol);
        } else {
          console.warn("[snapshots] upsert FAIL", symbol, error.message);
        }
      } catch (e) {
        console.warn("[snapshots] fetch FAIL", symbol, e?.message || e);
      }
    }
    console.log("[snapshots] writer result", { session, wrote });
    return { session, wrote };
  } catch (e) {
    console.warn("[snapshots] writer unavailable", e?.message || e);
    return { session, wrote: 0 };
  }
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
    const session = await readSession();
    const symbols = (process.env.WORKER_SYMBOLS || "SPY,QQQ").split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await Promise.resolve(mod.main());
      console.log("[diag] main() returned");
    } catch (e) {
      console.error("[diag] main() failed", e);
      throw e;
    }
    // --- scan_run + heartbeat with snapshot awareness (closed only) ---
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;
      if (!(url && key)) {
        console.warn("[scan_run] skipped: supabase env missing");
        return;
      }
      const sb = createClient(url, key, { auth: { persistSession: false } });

      let snapshot_count = 0;
      let snapshot_backed = false;
      if (session !== "closed") {
        const r = await writeSnapshotsIfActive(session, symbols);
        snapshot_count = r.wrote;
        console.log("[scan_run] active session snapshot_count", snapshot_count);
      } else if (symbols.length) {
        const { count, error } = await sb
          .from("snapshots")
          .select("symbol", { count: "exact", head: true })
          .in("symbol", symbols);
        if (!error) {
          snapshot_count = count || 0;
          snapshot_backed = snapshot_count > 0;
          console.log("[scan_run] closed session snapshot_count", snapshot_count);
        } else {
          console.warn("[snapshots] read FAIL", error.message);
        }
      }

      const now = new Date().toISOString();
      const scanRow = {
        job_name: "scan_run",
        window_start: now,
        status: "success",
        meta: {
          session,
          symbols,
          duration_ms: Date.now() - t0,
          noop: session === "closed" ? snapshot_count === 0 : false,
          snapshot_backed,
          snapshot_count,
          source: "start.mjs",
        },
      };
      const { error: sErr } = await sb.from("scan_jobs").upsert(scanRow, { onConflict: "job_name,window_start" });
      if (sErr) console.error("[scan_run] upsert FAIL", sErr.message);
      else console.log("[scan_run] upsert OK", now);

      const hbRow = {
        job_name: "heartbeat_worker",
        window_start: now,
        status: "success",
        meta: { source: "start.mjs", note: "post-main heartbeat", session },
      };
      const { error: hErr } = await sb.from("scan_jobs").upsert(hbRow, { onConflict: "job_name,window_start" });
      if (hErr) console.error("[heartbeat] upsert FAIL", hErr.message);
      else console.log("[heartbeat] upsert OK", now);
    } catch (e) {
      console.error("[scan_run] telemetry error", e?.message || e);
    }
  };
  if (process.env.WORKER_ONESHOT === "1") {
    run().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    run().catch(() => {});
    setInterval(() => run().catch(() => {}), every);
  }
} catch (e) {
  console.error("[diag] bootstrap failed", e);
  setTimeout(() => process.exit(1), 1000);
}
