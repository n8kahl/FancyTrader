// Lightweight bootstrap that avoids fragile "node -e" quoting.
// - If Railway treats the service as Web, we expose a tiny health endpoint on $PORT
// - Then we import the worker and run main() immediately and on an interval.
process.on("unhandledRejection", (e) => console.error("[diag] unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("[diag] uncaughtException", e));

const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const port = process.env.PORT;
if (port) {
  http
    .createServer((req, res) => {
      if (req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("worker");
    })
    .listen(port, "0.0.0.0", () => console.log("[diag] web health listening on", port));
}

(async () => {
  const distPath = path.join(__dirname, "dist", "index.js");
  const modUrl = pathToFileURL(distPath).href;
  const m = await import(modUrl);

  const every = Number(process.env.WORKER_EVERY_MS || 60000);
  console.log("[diag] env", {
    MASSIVE_API_KEY: !!process.env.MASSIVE_API_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    WORKER_SYMBOLS: process.env.WORKER_SYMBOLS || "SPY,QQQ",
    every,
  });

  const run = () =>
    Promise.resolve(m.main())
      .then(() => console.log("[diag] main() returned"))
      .catch((e) => console.error("[diag] main() failed", e));

  run();
  setInterval(run, every);
})();
