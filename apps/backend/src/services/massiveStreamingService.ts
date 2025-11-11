import EventEmitter from "events";
import WebSocket from "ws";
import { serverEnv } from "@fancytrader/shared/server";
import { logger } from "../utils/logger.js";

export type MassiveStreamingOptions = {
  baseUrl: string;
  apiKey: string;
  cluster?: string;
  subscriptions?: string[];
  logger?: (event: string, meta?: Record<string, unknown>) => void;
  serializeSubscribe?: (channels: string[]) => unknown;
  serializeUnsubscribe?: (channels: string[]) => unknown;
};

const log = (event: string, meta?: Record<string, unknown>) => logger.info("massive_ws", { event, ...meta });

function buildMassiveWsUrl(baseRaw: string, clusterRaw: string | undefined, apiKey: string) {
  const u = new URL(baseRaw);
  const segs = u.pathname.split("/").filter(Boolean);
  const baseEndsWithOptions = segs[segs.length - 1] === "options";
  const cluster = (clusterRaw ?? "").trim().replace(/^\/+|\/+$/g, "");
  const finalCluster = baseEndsWithOptions ? "" : cluster || "options";
  const mergedPath = [u.pathname.replace(/\/+$/g, ""), finalCluster]
    .filter(Boolean)
    .join("/");
  u.pathname = mergedPath || "/";
  u.searchParams.set("apiKey", apiKey);
  return u.toString();
}

export class MassiveStreamingService extends EventEmitter {
  private ws?: WebSocket;
  private readonly logFn: (event: string, meta?: Record<string, unknown>) => void;
  private closedByUser = false;
  private backoff = 250;
  private heartbeat?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private subs: string[];

  constructor(private readonly options: MassiveStreamingOptions) {
    super();
    if (!options.apiKey) {
      throw new Error("MASSIVE_API_KEY is required for streaming service");
    }
    this.subs = options.subscriptions ?? [];
    this.logFn = options.logger ?? ((event, meta) => log(event, meta));
  }

  start(): void {
    this.closedByUser = false;
    this.connect();
  }

  stop(): void {
    this.closedByUser = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.ws?.close();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  subscribe(channel: string): void {
    if (!this.subs.includes(channel)) this.subs.push(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe([channel]);
    }
  }

  unsubscribe(channel: string): void {
    this.subs = this.subs.filter((sub) => sub !== channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe([channel]);
    }
  }

  updateSubscriptions(subs: string[]): void {
    this.subs = subs;
    if (this.ws?.readyState === WebSocket.OPEN && subs.length > 0) {
      this.send({ action: "subscribe", params: subs.join(",") });
    }
  }

  private connect(): void {
    const wsUrl = buildMassiveWsUrl(
      this.options.baseUrl,
      this.options.cluster,
      this.options.apiKey
    );
    const safeUrl = (() => {
      try {
        const u = new URL(wsUrl);
        if (u.searchParams.has("apiKey")) {
          const raw = u.searchParams.get("apiKey") ?? "";
          const masked = raw.length > 6 ? `${raw.slice(0, 3)}***${raw.slice(-3)}` : "***";
          u.searchParams.set("apiKey", masked);
        }
        return u.toString();
      } catch {
        return "wss://<redacted>";
      }
    })();

    this.logFn("ws_connecting", { url: safeUrl });
    logger.info(
      "massive_ws",
      {
        event: "ws_url_computed",
        MASSIVE_WS_BASE: this.options.baseUrl,
        MASSIVE_WS_CLUSTER: this.options.cluster,
        wsUrl: safeUrl,
      }
    );
    this.ws = new WebSocket(wsUrl, {
      perMessageDeflate: false,
      maxPayload: serverEnv.WS_MAX_PAYLOAD_BYTES,
    });

    this.ws.on("open", () => this.handleOpen(safeUrl));
    this.ws.on("message", (buf) => this.handleMessage(buf));
    this.ws.on("close", (code) => this.handleClose(code));
    this.ws.on("error", (err) => this.handleError(err as Error));
    this.ws.on("pong", () => this.touchHeartbeat());
  }

  private handleOpen(url: string): void {
    this.logFn("ws_open", { url });
    this.backoff = 250;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.flushSubscriptions();
    this.startHeartbeat();
    this.emit("open");
  }

  private handleMessage(buffer: WebSocket.RawData): void {
    try {
      const msg = JSON.parse(buffer.toString());
      if (msg?.action === "pong") {
        this.touchHeartbeat();
        return;
      }
      this.emit("message", msg);
    } catch (error) {
      this.logFn("ws_message_parse_error", { error: String(error) });
    }
  }

  private handleClose(code: number): void {
    this.logFn("ws_close", { code });
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.ws = undefined;
    this.emit("close", code);
    if (!this.closedByUser) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.logFn("ws_error", { error: error.message });
    this.emit("error", error);
  }

  private flushSubscriptions(): void {
    if (!this.subs.length || this.ws?.readyState !== WebSocket.OPEN) return;
    this.sendSubscribe(this.subs);
  }

  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    const onPong = () => this.touchHeartbeat();
    this.ws?.off?.("pong", onPong);
    this.ws?.on?.("pong", onPong);

    const interval = serverEnv.WS_HEARTBEAT_INTERVAL_MS;
    const ping = () => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      try {
        (this.ws as any).ping?.();
      } catch (error) {
        this.logFn("ws_ping_error", { error: String(error) });
      }
      this.scheduleHeartbeatTimeout(interval);
    };

    ping();
    this.heartbeat = setInterval(ping, interval);
  }

  private touchHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }
  }

  private scheduleHeartbeatTimeout(intervalMs: number): void {
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    const timeoutMs = Math.max(5_000, Math.floor(intervalMs * 0.9));
    this.heartbeatTimeout = setTimeout(() => {
      this.logFn("ws_heartbeat_missed");
      try {
        this.ws?.terminate();
      } catch {
        /* ignore */
      }
    }, timeoutMs);
  }

  private scheduleReconnect(): void {
    const jitter = Math.random() * 100;
    const wait = Math.min(this.backoff + jitter, 5_000);
    this.logFn("ws_reconnect_scheduled", { wait });
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      this.backoff = Math.min(this.backoff * 2, 5_000);
      this.connect();
    }, wait);
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      this.logFn("ws_send_error", { error: String(error) });
    }
  }

  private sendSubscribe(channels: string[]): void {
    const payload =
      typeof this.options.serializeSubscribe === "function"
        ? this.options.serializeSubscribe(channels)
        : { action: "subscribe", params: channels.join(",") };
    this.send(payload as Record<string, unknown>);
  }

  private sendUnsubscribe(channels: string[]): void {
    const payload =
      typeof this.options.serializeUnsubscribe === "function"
        ? this.options.serializeUnsubscribe(channels)
        : { action: "unsubscribe", params: channels.join(",") };
    this.send(payload as Record<string, unknown>);
  }
}
