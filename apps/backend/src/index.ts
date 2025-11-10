import "dotenv/config";
import type { ServerOutbound } from "@fancytrader/shared";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupWebSocketHandler } from "./websocket/handler.js";
import { PolygonClient } from "./services/polygonClient.js";
import { AlertEvaluator, type AlertBroadcastPayload } from "./alerts/evaluator.js";
import { logger } from "./utils/logger.js";
import { createApp } from "./app.js";

declare global {
  var __WSS_READY__: boolean | undefined;
}

const boolFromEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const streamingEnabled = boolFromEnv(process.env.STREAMING_ENABLED, true);

const { app, services, streaming } = await createApp();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
globalThis.__WSS_READY__ = false;

const polygonClient = new PolygonClient();

const broadcastAlert = (payload: AlertBroadcastPayload): void => {
  const message: ServerOutbound = { type: "alert", ...payload };
  const serialized = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(serialized);
    }
  }
};

const alertEvaluator = new AlertEvaluator(services.alertRegistry, polygonClient, broadcastAlert);

setupWebSocketHandler(
  wss,
  { strategyDetector: services.strategyDetector },
  { enableStreaming: streamingEnabled }
);

if (!streamingEnabled) {
  logger.warn("Massive streaming disabled via STREAMING_ENABLED env");
}

alertEvaluator.start();
globalThis.__WSS_READY__ = true;
wss.on("close", () => {
  globalThis.__WSS_READY__ = false;
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  logger.info(`🚀 Fancy Trader Backend running on port ${PORT}`);
  logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  if (streaming) {
    void streaming.start().catch((error) => logger.error({ error }, "Streaming failed to start"));
  }
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  alertEvaluator.stop();

  globalThis.__WSS_READY__ = false;
  wss.clients.forEach((client) => client.close());
  wss.close();

  if (streaming) {
    await streaming.stop();
  }

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
});
