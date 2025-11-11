#!/usr/bin/env node
/* Quick E2E verification: healthz -> readyz -> market status -> WS connect */
import process from "node:process";
import WebSocket from "ws";

const base = (process.env.BACKEND_URL || process.argv[2] || "https://fancy-trader.up.railway.app").replace(/\/+$/, "");
const wsUrl = (process.env.BACKEND_WS_URL || base.replace(/^http/, "ws") + "/ws").replace(/\/+$/, "");

async function httpGet(path) {
  const url = base + path;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}

(async () => {
  console.log("🔎 Checking", base);
  console.log("GET /healthz ->", await httpGet("/healthz"));
  console.log("GET /readyz ->", await httpGet("/readyz"));
  console.log("GET /api/market/status ->", await httpGet("/api/market/status"));
  console.log("🔌 WS", wsUrl);
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timeout = setTimeout(() => reject(new Error("WS timeout")), 5000);
    socket.on("open", () => {
      clearTimeout(timeout);
      console.log("WS open ✅");
      socket.close(1000, "ok");
      resolve(undefined);
    });
    socket.on("error", (err) => reject(err));
  });
  console.log("✅ E2E OK");
})().catch((error) => {
  console.error("❌ E2E failed:", error.message || error);
  process.exit(1);
});
