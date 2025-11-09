import http from "node:http";
import { URL } from "node:url";

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }

    if ((req.method === "GET" || req.method === "POST") && url.pathname === "/run-now") {
      const session = url.searchParams.get("session") || null;
      json(res, 200, { ok: true, accepted: true, session, ts: new Date().toISOString() });

      const m = await workerModPromise;
      if (!m?.main) {
        console.error("[run-now] worker module not ready");
        return;
      }
      Promise.resolve(m.main({ forceSession: session || undefined }))
        .then(() => log("[run-now] main() returned"))
        .catch((e) => console.error("[run-now] main() failed", e));
      return;
    }

    if (req.method === "GET" && url.pathname === "/metrics") {
      const m = await workerModPromise;
      if (m?.metrics?.expose) {
        const text = await m.metrics.expose();
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(text);
      } else {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("# no metrics");
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
    const run = () =>
      Promise.resolve(m.main())
        .then(() => log("[diag] main() returned"))
        .catch((e) => console.error("[diag] main() failed", e));
    run();
    setInterval(run, EVERY);
  } else {
    console.warn("[diag] worker module not available yet");
  }
})();

server.listen(PORT, "0.0.0.0", () => log(`[diag] web health listening on ${PORT}`));
