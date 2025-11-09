import WebSocket from "ws";
import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";
import { incPolygonWsMessages } from "../utils/metrics.js";
import { StrategyDetectorService } from "./strategyDetector.js";
import { Bar, Trade, Quote } from "../types/index.js";
import { featureFlags } from "../config/features.js";

type PolygonCluster = "stocks" | "options" | "indices" | "forex" | "crypto";

const CLUSTER_PATH: Record<PolygonCluster, string> = {
  stocks: "/stocks",
  options: "/options",
  indices: "/indices",
  forex: "/forex",
  crypto: "/crypto",
};

export const channels = {
  trade: (symbol: string) => `T.${symbol}`,
  quote: (symbol: string) => `Q.${symbol}`,
  aggregate: (symbol: string) => `A.${symbol}`,
  minute: (symbol: string) => `AM.${symbol}`,
} as const;

type ChannelBuilder = {
  trade: (symbol: string) => string;
  quote: (symbol: string) => string;
  aggregate: (symbol: string) => string;
  minute?: (symbol: string) => string;
};

const defaultBuilder: ChannelBuilder = channels;

const CHANNEL_BUILDERS: Record<PolygonCluster, ChannelBuilder> = {
  stocks: defaultBuilder,
  forex: defaultBuilder,
  crypto: defaultBuilder,
  indices: {
    trade: (symbol) => `T.${symbol}`,
    quote: (symbol) => `Q.${symbol}`,
    aggregate: (symbol) => `A.${symbol}`,
  },
  options: {
    trade: (symbol) => `T.O:${symbol}`,
    quote: (symbol) => `Q.O:${symbol}`,
    aggregate: (symbol) => `A.O:${symbol}`,
  },
};

interface PolygonMessage {
  ev: string;
  sym?: string;
  v?: number;
  av?: number;
  op?: number;
  vw?: number;
  o?: number;
  c?: number;
  h?: number;
  l?: number;
  a?: number;
  s?: number;
  e?: number;
  p?: number;
  t?: number;
  bp?: number;
  ap?: number;
  bs?: number;
  as?: number;
}

interface StatusMessage extends PolygonMessage { status?: string; message?: string; }

type RawData = WebSocket.RawData;

export type PolygonServiceStatus = "initializing" | "healthy" | "degraded" | "offline";

export interface PolygonServiceState {
  source: "polygon";
  status: PolygonServiceStatus;
  reason?: string;
  timestamp: number;
}

declare global {
  var __POLYGON_STATE__: PolygonServiceState | undefined;
}

export class PolygonStreamingService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private apiKey: string;
  private subscribedSymbols = new Set<string>();
  private strategyDetector: StrategyDetectorService;
  private isAuthenticated = false;
  private readonly cluster: PolygonCluster;
  private readonly wsBase: string;
  private readonly fallbackBase: string;
  private currentBase: string;
  private readonly features = featureFlags;
  private backoffTimer: NodeJS.Timeout | null = null;
  private reconnectEnabled = true;
  private mockFeedTimer: NodeJS.Timeout | null = null;
  private lastServiceState: PolygonServiceState = { source: "polygon", status: "initializing", timestamp: Date.now() };

  constructor(strategyDetector: StrategyDetectorService) {
    super();
    this.apiKey = process.env.POLYGON_API_KEY || "";
    this.strategyDetector = strategyDetector;
    this.wsBase = process.env.POLYGON_WS_BASE || "wss://socket.polygon.io";
    this.fallbackBase = process.env.POLYGON_FALLBACK_WS_BASE || "wss://delayed.polygon.io";
    this.cluster = this.parseCluster(process.env.POLYGON_WS_CLUSTER);
    this.currentBase = this.wsBase;
    const initialStatus: PolygonServiceStatus = this.features.enablePolygonStream
      ? "initializing"
      : "offline";
    const initialReason = this.features.enablePolygonStream ? undefined : "disabled";
    this.setServiceState(initialStatus, initialReason);

    if (!this.apiKey && this.features.enablePolygonStream) {
      throw new Error("POLYGON_API_KEY is required for streaming");
    }
  }

  async connect(): Promise<void> {
    if (!this.features.enablePolygonStream) {
      logger.info("Polygon streaming disabled via FEATURE_ENABLE_POLYGON_STREAM");
      this.setServiceState("offline", "disabled");
      return Promise.resolve();
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.info("WebSocket already connected");
      return;
    }

    this.reconnectEnabled = true;
    this.clearBackoffTimer();

    return new Promise((resolve, reject) => {
      try {
        const url = this.buildWebSocketUrl(this.currentBase);
        logger.info("Connecting to Polygon WebSocket", { url, cluster: this.cluster });
        this.ws = new WebSocket(url);

        this.ws.on("open", () => {
          logger.info("Connected to Polygon WebSocket");
          this.authenticate();
        });

        this.ws.on("message", (data: RawData) => {
          const text = this.normalizeMessage(data);
          if (text) {
            this.handleMessage(text);
          }
        });

        this.ws.on("close", (code) => {
          logger.warn("Polygon WebSocket closed", { code });
          this.isAuthenticated = false;
          this.disableMockFeed();
          if (this.backoffTimer) {
            logger.info("Reconnect already scheduled; waiting for backoff window");
            return;
          }
          this.attemptReconnect();
        });

        this.ws.on("error", (error) => {
          logger.error("Polygon WebSocket error", { error });
          reject(error instanceof Error ? error : new Error(String(error)));
        });

        const checkAuth = setInterval(() => {
          if (this.isAuthenticated) {
            clearInterval(checkAuth);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkAuth);
          if (!this.isAuthenticated) {
            reject(new Error("Authentication timeout"));
          }
        }, 10000);
      } catch (error) {
        logger.error("Failed to connect to Polygon WebSocket", { error });
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private authenticate(): void {
    if (!this.ws) return;

    const authMessage = {
      action: "auth",
      params: this.apiKey,
    };

    this.ws.send(JSON.stringify(authMessage));
    logger.info("Sent authentication to Polygon");
  }

  private handleMessage(data: string): void {
    try {
      const messages: PolygonMessage[] = JSON.parse(data);
      if (Array.isArray(messages) && messages.length > 0) {
        incPolygonWsMessages(messages.length);
      }

      messages.forEach((msg) => {
        switch (msg.ev) {
          case "status":
            this.handleStatusMessage(msg);
            break;
          case "AM":
          case "A":
            this.handleAggregateMessage(msg);
            break;
          case "T":
            this.handleTradeMessage(msg);
            break;
          case "Q":
            this.handleQuoteMessage(msg);
            break;
          default:
            logger.debug("Unknown message type", { event: msg.ev });
        }
      });
    } catch (error) {
      logger.error("Error parsing WebSocket message", { error });
    }
  }

  private handleStatusMessage(msg: StatusMessage): void {
    logger.info("Status message", { status: msg.status, message: msg.message });

    if (msg.status === "max_connections") {
      this.handleMaxConnections();
      return;
    }

    if (msg.status === "auth_success") {
      this.isAuthenticated = true;
      this.reconnectAttempts = 0;
      this.disableMockFeed();
      this.setServiceState("healthy");

      if (this.subscribedSymbols.size > 0) {
        this.resubscribeAll();
      }
    } else if (msg.status === "auth_failed") {
      logger.warn("Authentication failed");
      this.isAuthenticated = false;
      this.handleAuthFailure();
      this.setServiceState("degraded", "auth_failed");
    }
  }

  private handleMaxConnections(): void {
    logger.warn("Polygon max_connections hit – entering degraded mode");
    this.setServiceState("degraded", "max_connections");

    if (this.features.enableMockStream) {
      this.enableMockFeed();
    }

    if (this.features.polygonBackoffOnMax) {
      const delayMs = Math.max(this.features.polygonMaxSleepMs, this.reconnectDelay);
      this.scheduleReconnect({ delayMs, reason: "max_connections", resetAttempts: true });
    } else {
      this.stopReconnecting("max_connections");
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, "max_connections");
    }
  }

  private handleAggregateMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const bar: Bar = {
      symbol: msg.sym,
      timestamp: msg.s || Date.now(),
      open: msg.o || 0,
      high: msg.h || 0,
      low: msg.l || 0,
      close: msg.c || 0,
      volume: msg.v || 0,
      vwap: msg.vw,
    };

    this.strategyDetector.processBar(bar);
  }

  private handleTradeMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const trade: Trade = {
      symbol: msg.sym,
      timestamp: msg.t || Date.now(),
      price: msg.p || 0,
      size: msg.s || 0,
    };

    this.strategyDetector.processTrade(trade);
  }

  private handleQuoteMessage(msg: PolygonMessage): void {
    if (!msg.sym) return;

    const quote: Quote = {
      symbol: msg.sym,
      timestamp: msg.t || Date.now(),
      bid: msg.bp || 0,
      ask: msg.ap || 0,
      bidSize: msg.bs || 0,
      askSize: msg.as || 0,
    };

    this.strategyDetector.processQuote(quote);
  }

  subscribe(symbols: string[]): void {
    if (!this.ws || !this.isAuthenticated) {
      logger.warn("Cannot subscribe: not connected or authenticated");
      symbols.forEach((s) => this.subscribedSymbols.add(s));
      return;
    }

    const subscribeMessage = {
      action: "subscribe",
      params: this.buildChannelList(symbols),
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    symbols.forEach((s) => this.subscribedSymbols.add(s));

    logger.info("Subscribed to symbols", { count: symbols.length });
  }

  unsubscribe(symbols: string[]): void {
    if (!this.ws || !this.isAuthenticated) {
      logger.warn("Cannot unsubscribe: not connected or authenticated");
      return;
    }

    const unsubscribeMessage = {
      action: "unsubscribe",
      params: this.buildChannelList(symbols),
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    symbols.forEach((s) => this.subscribedSymbols.delete(s));

    logger.info("Unsubscribed from symbols", { count: symbols.length });
  }

  private resubscribeAll(): void {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length > 0) {
      this.subscribe(symbols);
    }
  }

  private attemptReconnect(): void {
    if (!this.features.enablePolygonStream) {
      return;
    }
    if (!this.reconnectEnabled) {
      logger.warn("Reconnect attempts are disabled");
      return;
    }
    if (this.backoffTimer) {
      logger.info("Reconnect already scheduled; skipping immediate attempt");
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnect attempts reached");
      this.setServiceState("degraded", "max_attempts");
      return;
    }

    this.reconnectAttempts++;
    this.scheduleReconnect({ delayMs: this.reconnectDelay, reason: "close" });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
      this.subscribedSymbols.clear();
      logger.info("Disconnected from Polygon WebSocket");
    }
    this.clearBackoffTimer();
    this.disableMockFeed();
    this.setServiceState("offline", "disconnected");
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  onServiceState(listener: (state: PolygonServiceState) => void): () => void {
    this.on("service-state", listener);
    return () => this.off("service-state", listener);
  }

  getServiceState(): PolygonServiceState | undefined {
    return this.lastServiceState;
  }

  private scheduleReconnect(options: {
    delayMs: number;
    reason: string;
    resetAttempts?: boolean;
  }): void {
    if (!this.features.enablePolygonStream) {
      return;
    }
    if (!this.reconnectEnabled) {
      logger.warn("Reconnect disabled; not scheduling", { reason: options.reason });
      return;
    }
    if (this.backoffTimer) {
      logger.info("Reconnect already scheduled", { reason: options.reason });
      return;
    }
    if (options.resetAttempts) {
      this.reconnectAttempts = 0;
    }

    const delay = Math.max(options.delayMs, 0);
    logger.info("Scheduling reconnect", {
      delaySeconds: Math.round(delay / 1000),
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      reason: options.reason,
    });

    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      this.connect().catch((err) => {
        logger.error("Reconnection failed", { error: err });
        this.attemptReconnect();
      });
    }, delay);
  }

  private stopReconnecting(reason: string): void {
    this.reconnectEnabled = false;
    this.clearBackoffTimer();
    logger.warn("Polygon reconnect attempts disabled", { reason });
  }

  private clearBackoffTimer(): void {
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
  }

  private enableMockFeed(): void {
    if (this.mockFeedTimer) {
      return;
    }
    logger.warn("Enabling mock Polygon feed – live updates unavailable");
    this.mockFeedTimer = setInterval(() => {
      logger.debug("Mock Polygon feed heartbeat");
    }, 10_000);
  }

  private disableMockFeed(): void {
    if (this.mockFeedTimer) {
      clearInterval(this.mockFeedTimer);
      this.mockFeedTimer = null;
      logger.debug("Mock Polygon feed stopped");
    }
  }

  private setServiceState(status: PolygonServiceStatus, reason?: string): void {
    const next: PolygonServiceState = {
      source: "polygon",
      status,
      reason,
      timestamp: Date.now(),
    };
    this.lastServiceState = next;
    globalThis.__POLYGON_STATE__ = next;
    this.emit("service-state", next);
  }

  private normalizeMessage(data: RawData): string | null {
    if (typeof data === "string") {
      return data;
    }

    if (data instanceof Buffer) {
      return data.toString("utf-8");
    }

    if (Array.isArray(data)) {
      const buffers = data.map((chunk) =>
        typeof chunk === "string" ? Buffer.from(chunk, "utf-8") : chunk
      );
      return Buffer.concat(buffers).toString("utf-8");
    }

    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString("utf-8");
    }

    logger.warn("Received unsupported WebSocket data type", { type: typeof data });
    return null;
  }

  private buildWebSocketUrl(base: string): string {
    return `${base}${CLUSTER_PATH[this.cluster]}`;
  }

  private parseCluster(value?: string): PolygonCluster {
    const normalized = (value || "options").toLowerCase() as PolygonCluster;
    const valid: PolygonCluster[] = ["stocks", "options", "indices", "forex", "crypto"];
    if (valid.includes(normalized)) {
      return normalized;
    }
    logger.warn("Unknown POLYGON_WS_CLUSTER provided, defaulting to 'options'", { value });
    return "options";
  }

  private buildChannelList(symbols: string[]): string[] {
    const builder = CHANNEL_BUILDERS[this.cluster] ?? defaultBuilder;
    const params: string[] = [];

    symbols.forEach((symbol) => {
      params.push(builder.trade(symbol));
      params.push(builder.quote(symbol));
      params.push(builder.aggregate(symbol));
      if (builder.minute) {
        params.push(builder.minute(symbol));
      }
    });

    return params;
  }

  private handleAuthFailure(): void {
    if (this.currentBase !== this.fallbackBase) {
      logger.warn("Realtime feed not available; falling back to delayed feed");
      this.currentBase = this.fallbackBase;
      this.reconnectAttempts = 0;
      this.resetSocket();
    } else {
      logger.error("Authentication failed on delayed feed");
    }
  }

  private resetSocket(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        logger.warn("Error while closing Polygon socket", { error });
      }
      this.ws = null;
      this.isAuthenticated = false;
    }
  }
}
