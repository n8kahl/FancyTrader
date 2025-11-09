import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { RawData, WebSocket } from "ws";
import type { ServerOutbound } from "@fancytrader/shared/cjs";
import { z } from "zod";
import { WSMessage, DetectedSetup } from "../types";
import { PolygonStreamingService } from "../services/polygonStreamingService";
import { StrategyDetectorService } from "../services/strategyDetector";
import { logger } from "../utils/logger";
import { onWsConnect, onWsDisconnect } from "../utils/metrics";
import { isAllowedOrigin } from "../security/wsGuard";

interface ClientMeta {
  subscribedSymbols: Set<string>;
  lastActivity: number;
}

const clientMeta = new WeakMap<WebSocket, ClientMeta>();

interface Services {
  polygonService: PolygonStreamingService;
  strategyDetector: StrategyDetectorService;
}

interface HandlerOptions {
  enableStreaming?: boolean;
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
  const { polygonService, strategyDetector } = services;
  const enableStreaming = options.enableStreaming ?? true;

  if (enableStreaming) {
    polygonService.connect().catch((err) => {
      logger.error("Failed to connect to Polygon", { error: err });
    });
  } else {
    logger.warn("Polygon streaming disabled; skipping upstream WebSocket connection");
  }

  if (typeof polygonService.onServiceState === "function") {
    polygonService.onServiceState((state) => {
      broadcastToAll(wss, {
        type: "SERVICE_STATE",
        payload: state,
        timestamp: state.timestamp ?? Date.now(),
      });
    });
  }

  const heartbeatInterval = setInterval(() => {
    const now = Date.now();

    for (const ws of wss.clients) {
      const meta = clientMeta.get(ws);
      if (!meta) continue;

      if (ws.readyState === ws.OPEN) {
        sendServerOutbound(ws, { type: "STATUS", message: "HEARTBEAT" });
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

    const latestServiceState =
      typeof polygonService.getServiceState === "function"
        ? polygonService.getServiceState()
        : undefined;
    if (latestServiceState) {
      sendServerOutbound(ws, {
        type: "SERVICE_STATE",
        payload: latestServiceState,
        timestamp: latestServiceState.timestamp ?? Date.now(),
      });
    }

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
        handleClientMessage(ws, message, services);
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
          polygonService.unsubscribe(toUnsubscribe);
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
      type: "SETUP_UPDATE",
      payload: {
        status: "connected",
        message: "Connected to Fancy Trader backend",
      },
      timestamp: Date.now(),
    });

    const activeSetups = strategyDetector.getActiveSetups();
    if (activeSetups.length > 0) {
      sendMessage(ws, {
        type: "SETUP_UPDATE",
        payload: { setups: activeSetups },
        timestamp: Date.now(),
      });
    }
  });

  strategyDetector.on("setup-detected", (setup: DetectedSetup) => {
    broadcastToAll(wss, {
      type: "SETUP_UPDATE",
      payload: { action: "new", setup },
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

function handleClientMessage(ws: WebSocket, message: InboundMessage, services: Services): void {
  const { polygonService } = services;

  switch (message.type) {
    case "SUBSCRIBE":
      handleSubscribe(ws, message.payload, polygonService);
      break;
    case "UNSUBSCRIBE":
      handleUnsubscribe(ws, message.payload, polygonService);
      break;
    case "PING":
      sendMessage(ws, { type: "PONG", timestamp: Date.now() });
      break;
  }
}

function handleSubscribe(
  ws: WebSocket,
  payload: SubscriptionPayload,
  polygonService: PolygonStreamingService
): void {
  const meta = clientMeta.get(ws);
  if (!meta) {
    logger.warn("Missing client meta during subscribe");
    return;
  }

  const symbols = payload.symbols;
  symbols.forEach((s) => meta.subscribedSymbols.add(s));
  polygonService.subscribe(symbols);

  sendServerOutbound(ws, {
    type: "SUBSCRIPTIONS",
    symbols: Array.from(meta.subscribedSymbols),
  });

  logger.info("Client subscribed", { count: symbols.length });
}

function handleUnsubscribe(
  ws: WebSocket,
  payload: SubscriptionPayload,
  polygonService: PolygonStreamingService
): void {
  const meta = clientMeta.get(ws);
  if (!meta) {
    logger.warn("Missing client meta during unsubscribe");
    return;
  }

  const symbols = payload.symbols;
  symbols.forEach((s) => meta.subscribedSymbols.delete(s));
  polygonService.unsubscribe(symbols);

  sendServerOutbound(ws, {
    type: "SUBSCRIPTIONS",
    symbols: Array.from(meta.subscribedSymbols),
  });

  logger.info("Client unsubscribed", { count: symbols.length });
}

function sendMessage(ws: WebSocket, message: WSMessage): void {
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
  sendServerOutbound(ws, { type: "ERROR", message: error });
}

function broadcastToAll(wss: WebSocketServer, message: WSMessage): void {
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
