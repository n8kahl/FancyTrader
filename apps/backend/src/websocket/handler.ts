import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { RawData, WebSocket } from "ws";
import type { ServerOutbound } from "@fancytrader/shared";
import { z } from "zod";
import { DetectedSetup, WSMessage } from "../types/index.js";
import { MassiveStreamingService } from "../services/massiveStreamingService.js";
import { StrategyDetectorService } from "../services/strategyDetector.js";
import { logger } from "../utils/logger.js";
import { onWsConnect, onWsDisconnect } from "../utils/metrics.js";
import { isAllowedOrigin } from "../security/wsGuard.js";
import { featureFlags } from "../config/features.js";

interface ClientMeta {
  subscribedSymbols: Set<string>;
  lastActivity: number;
}

const clientMeta = new WeakMap<WebSocket, ClientMeta>();

interface Services {
  strategyDetector: StrategyDetectorService;
}

interface HandlerOptions {
  enableStreaming?: boolean;
  streamingService?: MassiveStreamingService;
}

const subscriptionPayloadSchema = z.object({
  symbols: z.array(z.string().min(1)).nonempty(),
});

const inboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SUBSCRIBE"), payload: subscriptionPayloadSchema }),
  z.object({ type: z.literal("UNSUBSCRIBE"), payload: subscriptionPayloadSchema }),
  z.object({ type: z.literal("PING"), payload: z.unknown().optional() }),
]);

type InboundMessage = z.infer<typeof inboundSchema>;
type SubscriptionPayload = z.infer<typeof subscriptionPayloadSchema>;

export function setupWebSocketHandler(
  wss: WebSocketServer,
  services: Services,
  options: HandlerOptions = {}
): void {
  const { strategyDetector } = services;
  const enableStreaming = options.enableStreaming ?? featureFlags.enableMockStream === false;
  const streamingService =
    options.streamingService ??
    new MassiveStreamingService({
      baseUrl: process.env.MASSIVE_WS_BASE || "wss://socket.massive.com",
      apiKey: process.env.MASSIVE_API_KEY || "",
      cluster: process.env.MASSIVE_WS_CLUSTER || "options",
    });

  if (enableStreaming) {
    try {
      streamingService.start();
    } catch (error) {
      logger.error("Failed to connect to Massive", { error });
    }
  } else {
    logger.warn("Massive streaming disabled; skipping upstream WebSocket connection");
  }

  streamingService.on("message", (payload: unknown) => {
    if (typeof payload === "object" && payload !== null && "type" in payload) {
      broadcastToAll(wss, payload as ServerOutbound);
      return;
    }
    const msg: WSMessage = { type: "status", payload: payload as WSMessage["payload"] };
    wss.clients.forEach((client) => client.readyState === 1 && client.send(JSON.stringify(msg)));
  });

  streamingService.on("open", () => {
    broadcastToAll(wss, {
      type: "SERVICE_STATE",
      payload: {
        source: "massive",
        status: "healthy",
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  });

  streamingService.on("close", () => {
    broadcastToAll(wss, {
      type: "SERVICE_STATE",
      payload: {
        source: "massive",
        status: "offline",
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  });

  streamingService.on("error", (error) => {
    logger.error("Massive streaming error", { error });
  });

  const heartbeatInterval = setInterval(() => {
    const now = Date.now();

    for (const ws of wss.clients) {
      const meta = clientMeta.get(ws);
      if (!meta) continue;

      if (ws.readyState === ws.OPEN) {
        sendServerOutbound(ws, { type: "status", message: "HEARTBEAT" });
      }

      if (now - meta.lastActivity > 60_000) {
        logger.warn("Closing idle WebSocket connection");
        ws.close(1000, "idle timeout");
        clientMeta.delete(ws);
      }
    }
  }, 15_000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
    streamingService.stop();
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const originHeader = req.headers["origin"];
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    if (!isAllowedOrigin(origin)) {
      logger.warn("Blocked WebSocket origin", { origin });
      ws.close(1008, "origin not allowed");
      return;
    }
    logger.info("New WebSocket client connected");
    onWsConnect();

    clientMeta.set(ws, { subscribedSymbols: new Set(), lastActivity: Date.now() });

    ws.on("pong", () => {
      const meta = clientMeta.get(ws);
      if (meta) {
        meta.lastActivity = Date.now();
      }
    });

    ws.on("message", (data: RawData) => {
      const meta = clientMeta.get(ws);
      if (meta) {
        meta.lastActivity = Date.now();
      }

      try {
        const raw = JSON.parse(rawDataToString(data));
        const message = inboundSchema.parse(raw);
        handleClientMessage(ws, message, streamingService);
      } catch (error) {
        logger.error("Error parsing WebSocket message", { error });
        sendError(ws, "Invalid message format");
      }
    });

    ws.on("close", () => {
      logger.info("WebSocket client disconnected");

      const meta = clientMeta.get(ws);
      if (meta && meta.subscribedSymbols.size > 0) {
        const symbols = Array.from(meta.subscribedSymbols);
        const otherClientsSymbols = new Set<string>();

        for (const client of wss.clients) {
          if (client === ws) continue;
          const otherMeta = clientMeta.get(client);
          if (!otherMeta) continue;
          otherMeta.subscribedSymbols.forEach((s) => otherClientsSymbols.add(s));
        }

        const toUnsubscribe = symbols.filter((s) => !otherClientsSymbols.has(s));
        if (toUnsubscribe.length > 0) {
          toUnsubscribe.forEach((symbol) => streamingService.unsubscribe(symbol));
        }
      }

      clientMeta.delete(ws);
      onWsDisconnect();
    });

    ws.on("error", (error) => {
      logger.error("WebSocket error", { error });
      ws.close(1011, "Internal error");
    });

    sendMessage(ws, {
      type: "SERVICE_STATE",
      payload: {
        source: "massive",
        status: "healthy",
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    const activeSetups = strategyDetector.getActiveSetups();
    if (activeSetups.length > 0) {
      sendMessage(ws, {
        type: "SETUP_UPDATE",
        payload: { setups: activeSetups.map((setup) => ({ ...setup })) },
        timestamp: Date.now(),
      });
    }
  });

  strategyDetector.on("setup-detected", (setup: DetectedSetup) => {
    broadcastToAll(wss, {
      type: "SETUP_UPDATE",
      payload: { action: "new", setup: { ...setup } },
      timestamp: Date.now(),
    });
  });

  strategyDetector.on("target-hit", (data: Record<string, unknown>) => {
    broadcastToAll(wss, {
      type: "SETUP_UPDATE",
      payload: { action: "target_hit", ...data },
      timestamp: Date.now(),
    });
  });

  strategyDetector.on("stop-loss-hit", (data: Record<string, unknown>) => {
    broadcastToAll(wss, {
      type: "SETUP_UPDATE",
      payload: { action: "stop_loss", ...data },
      timestamp: Date.now(),
    });
  });

  logger.info("WebSocket handler initialized");
}

function handleClientMessage(
  ws: WebSocket,
  message: InboundMessage,
  streamingService: MassiveStreamingService
): void {
  switch (message.type) {
    case "SUBSCRIBE":
      handleSubscribe(ws, message.payload, streamingService);
      break;
    case "UNSUBSCRIBE":
      handleUnsubscribe(ws, message.payload, streamingService);
      break;
    case "PING":
      sendMessage(ws, { type: "PONG", timestamp: Date.now() });
      break;
  }
}

function handleSubscribe(
  ws: WebSocket,
  payload: SubscriptionPayload,
  streamingService: MassiveStreamingService
): void {
  const meta = clientMeta.get(ws);
  if (!meta) {
    logger.warn("Missing client meta during subscribe");
    return;
  }

  const symbols = payload.symbols;
  symbols.forEach((s) => meta.subscribedSymbols.add(s));
  symbols.forEach((symbol) => streamingService.subscribe(symbol));

  sendServerOutbound(ws, {
    type: "SUBSCRIPTIONS",
    symbols: Array.from(meta.subscribedSymbols),
  });

  logger.info("Client subscribed", { count: symbols.length });
}

function handleUnsubscribe(
  ws: WebSocket,
  payload: SubscriptionPayload,
  streamingService: MassiveStreamingService
): void {
  const meta = clientMeta.get(ws);
  if (!meta) {
    logger.warn("Missing client meta during unsubscribe");
    return;
  }

  const symbols = payload.symbols;
  symbols.forEach((s) => meta.subscribedSymbols.delete(s));
  symbols.forEach((symbol) => streamingService.unsubscribe(symbol));

  sendServerOutbound(ws, {
    type: "SUBSCRIPTIONS",
    symbols: Array.from(meta.subscribedSymbols),
  });

  logger.info("Client unsubscribed", { count: symbols.length });
}

function sendMessage(ws: WebSocket, message: ServerOutbound): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendServerOutbound(ws: WebSocket, message: ServerOutbound): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, error: string): void {
  sendServerOutbound(ws, { type: "error", message: error });
}

function broadcastToAll(wss: WebSocketServer, message: ServerOutbound): void {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString("utf-8");
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf-8");
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf-8");
  }

  return String(data);
}
