import EventEmitter from "events";
import WebSocket from "ws";
import { logger } from "../utils/logger";

export type MassiveStreamingOptions = {
  baseUrl: string;
  apiKey: string;
  cluster?: string;
  subscriptions?: string[];
  logger?: (event: string, meta?: Record<string, unknown>) => void;
};

const log = (event: string, meta?: Record<string, unknown>) => logger.info({ event, ...meta }, "massive_ws");

export class MassiveStreamingService extends EventEmitter {
  private ws?: WebSocket;
  private readonly logFn: (event: string, meta?: Record<string, unknown>) => void;
  private closedByUser = false;
  private backoff = 250;
  private heartbeat?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private subs: string[];

  constructor(private readonly options: MassiveStreamingOptions) {
    super();
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
  }

  subscribe(channel: string): void {
    if (this.subs.includes(channel)) return;
    this.subs.push(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ action: "subscribe", params: channel });
    }
  }

  unsubscribe(channel: string): void {
    this.subs = this.subs.filter((sub) => sub !== channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ action: "unsubscribe", params: channel });
    }
  }

  updateSubscriptions(subs: string[]): void {
    this.subs = subs;
    if (this.ws?.readyState === WebSocket.OPEN && subs.length) {
      this.send({ action: "subscribe", params: subs.join(",") });
    }
  }

  private connect(): void {
    const url = `${this.options.baseUrl}/${this.options.cluster ?? "options"}?apiKey=${this.options.apiKey}`;
    this.logger("ws_connecting", { url });
    this.ws = new WebSocket(url);

    this.ws.on("open", () => this.handleOpen(url));
    this.ws.on("message", (buf) => this.handleMessage(buf));
    this.ws.on("close", (code) => this.handleClose(code));
    this.ws.on("error", (error) => this.handleError(error as Error));
  }

  private handleOpen(url: string): void {
    this.logger("ws_open", { url });
    this.backoff = 250;
    this.flushSubscriptions();
    this.startHeartbeat();
    this.emit("open");
  }

  private handleMessage(buffer: WebSocket.RawData): void {
    try {
      const msg = JSON.parse(buffer.toString());
      if (msg.action === "pong") {
        this.touchHeartbeat();
        return;
      }
      this.emit("message", msg);
    } catch (error) {
      this.logger("ws_parse_error", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private handleClose(code?: number): void {
    this.logger("ws_close", { code });
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    if (!this.closedByUser) {
      this.scheduleReconnect();
    }

    this.emit("close", code);
  }

  private handleError(error: Error): void {
    this.logger("ws_error", { error: error.message });
    this.emit("error", error);
  }

  private flushSubscriptions(): void {
    if (!this.subs.length || this.ws?.readyState !== WebSocket.OPEN) return;
    this.send({ action: "subscribe", params: this.subs.join(",") });
  }

  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    const ping = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ action: "ping" });
        this.scheduleHeartbeatTimeout();
      }
    };

    ping();
    this.heartbeat = setInterval(ping, 20_000);
  }

  private touchHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.scheduleHeartbeatTimeout();
    }
  }

  private scheduleHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.heartbeatTimeout = setTimeout(() => {
      this.logger("ws_heartbeat_missed");
      this.ws?.terminate();
    }, 45_000);
  }

  private scheduleReconnect(): void {
    const jitter = Math.random() * 100;
    const wait = Math.min(this.backoff + jitter, 5000);
    this.logger("ws_reconnect_scheduled", { wait });
    setTimeout(() => {
      this.backoff = Math.min(this.backoff * 2, 5000);
      this.connect();
    }, wait);
  }

  private send(payload: Record<string, unknown>): void {
    try {
      this.ws?.send(JSON.stringify(payload));
    } catch (error) {
      logger.warn("Failed to send WS payload", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private logger(event: string, meta?: Record<string, unknown>): void {
    this.logFn(event, meta);
  }
}
