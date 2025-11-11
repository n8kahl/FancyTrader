import "dotenv/config";
import type { ServerOutbound } from "@fancytrader/shared";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupWebSocketHandler } from "./websocket/handler.js";
import { MassiveRestClient } from "./services/massiveClient.js";
import { AlertEvaluator, type AlertBroadcastPayload } from "./alerts/evaluator.js";
import { logger } from "./utils/logger.js";
import { Config } from "./config.js";
import { createApp } from "./app.js";
import { serverEnv } from "@fancytrader/shared/server";
import { validateEnv } from "./utils/envCheck.js";

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

validateEnv();
logger.info("startup_env", {
  STREAMING_ENABLED: process.env.STREAMING_ENABLED,
  FEATURE_ENABLE_MASSIVE_STREAM: serverEnv.FEATURE_ENABLE_MASSIVE_STREAM,
  MASSIVE_WS_BASE: serverEnv.MASSIVE_WS_BASE,
  MASSIVE_WS_CLUSTER: serverEnv.MASSIVE_WS_CLUSTER,
});

try {
  const { app, services, streaming } = await createApp();
  const server = createServer(app);
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: serverEnv.WS_MAX_PAYLOAD_BYTES,
  });
  server.on("upgrade", (req, socket, head) => {
    const origin = req.headers.origin;
    if (!origin || !Config.allowedOrigins.includes(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    if (req.url === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });
  globalThis.__WSS_READY__ = false;

  const massiveClient = new MassiveRestClient();

  const broadcastAlert = (payload: AlertBroadcastPayload): void => {
    const message: ServerOutbound = { type: "alert", ...payload };
    const serialized = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(serialized);
      }
    }
  };

  const alertEvaluator = new AlertEvaluator(services.alertRegistry, massiveClient, broadcastAlert);

  setupWebSocketHandler(
    wss,
    { strategyDetector: services.strategyDetector },
    { enableStreaming: false }
  );

  if (!streamingEnabled) {
    logger.warn("Massive streaming disabled via STREAMING_ENABLED env");
  }

  alertEvaluator.start();
  globalThis.__WSS_READY__ = true;
  wss.on("close", () => {
    globalThis.__WSS_READY__ = false;
  });

  const PORT = Config.port;

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Fancy Trader Backend running on port ${PORT}`);
    logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    if (streaming) {
      void streaming.start().catch((error) =>
        logger.error("Streaming failed to start", { error })
      );
    }
  });

  const shutdown = async (signal: string) => {
    try {
      logger.warn(`Received ${signal}, shutting down...`);
      alertEvaluator.stop();
      globalThis.__WSS_READY__ = false;
      wss.clients.forEach((client) => client.close());
      wss.close();
      if (streaming && typeof streaming.stop === "function") {
        await streaming.stop();
      }
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    } catch (e) {
      logger.error("Error during shutdown", { error: e });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
} catch (err) {
  logger.error("fatal error while starting backend", { err });
  process.exit(1);
}
