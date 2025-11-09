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
  const run = () =>
    Promise.resolve(mod.main())
      .then(() => console.log("[diag] main() returned"))
      .catch((e) => console.error("[diag] main() failed", e));
  run();
  setInterval(run, every);
} catch (e) {
  console.error("[diag] bootstrap failed", e);
  setTimeout(() => process.exit(1), 1000);
}
