import { BACKEND_CONFIG } from "../config/backend";
import { logger } from "../utils/logger";
import { wsInboundSchema, wsOutboundSchema } from "@fancytrader/shared";
import type { ClientInbound, ServerOutbound } from "@fancytrader/shared";

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

export type WSMessageType =
  | "SUBSCRIBE"
  | "UNSUBSCRIBE"
  | "SETUP_UPDATE"
  | "PRICE_UPDATE"
  | "OPTIONS_UPDATE"
  | "ERROR"
  | "PING"
  | "PONG"
  | "STATUS"
  | "SUBSCRIPTIONS"
  | "ALERT"
  | "SERVICE_STATE";

export interface WSMessage {
  type: WSMessageType;
  payload?: unknown;
  timestamp?: number;
}

type MessageHandler = (message: WSMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: unknown) => void;
type StateHandler = (state: ConnectionState) => void;

const MAX_BACKOFF_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 30000;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "DISCONNECTED";
  private url = BACKEND_CONFIG.wsUrl;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastMessageAt = 0;
  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private disconnectionHandlers = new Set<ConnectionHandler>();
  private errorHandlers = new Set<ErrorHandler>();
  private stateHandlers = new Set<StateHandler>();
  private subscribedSymbols = new Set<string>();

  connect(url = BACKEND_CONFIG.wsUrl): void {
    this.url = url;
    if (this.state === "CONNECTING" || this.state === "CONNECTED") {
      return;
    }
    this.openSocket(false);
  }

  close(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.setState("DISCONNECTED");
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect(): void {
    this.close();
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
    const uniqueSymbols = Array.from(new Set(symbols));
    if (uniqueSymbols.length === 0) {
      return;
    }
    if (this.state === "CONNECTED") {
      this.send({
        type: "SUBSCRIBE",
        payload: { symbols: uniqueSymbols as [string, ...string[]] },
      });
    }
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((symbol) => this.subscribedSymbols.delete(symbol));
    const uniqueSymbols = Array.from(new Set(symbols));
    if (uniqueSymbols.length === 0) {
      return;
    }
    if (this.state === "CONNECTED") {
      this.send({
        type: "UNSUBSCRIBE",
        payload: { symbols: uniqueSymbols as [string, ...string[]] },
      });
    }
  }

  resubscribeAll(): void {
    if (this.state === "CONNECTED" && this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols) as [string, ...string[]];
      this.send({ type: "SUBSCRIBE", payload: { symbols } });
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => this.stateHandlers.delete(handler);
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getConnectionStatus(): boolean {
    return this.state === "CONNECTED";
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  private openSocket(isReconnect: boolean): void {
    this.clearReconnectTimer();
    this.setState(isReconnect ? "RECONNECTING" : "CONNECTING");

    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => this.handleOpen();
      this.ws.onclose = () => this.handleClose();
      this.ws.onerror = (event) => this.handleError(event);
      this.ws.onmessage = (event) => this.handleRawMessage(event);
    } catch (error) {
      logger.error("Failed to create WebSocket", { error });
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    logger.info("WebSocket connected");
    this.reconnectAttempts = 0;
    this.lastMessageAt = Date.now();
    this.clearHeartbeatTimer();
    this.startHeartbeatTimer();
    this.setState("CONNECTED");
    this.connectionHandlers.forEach((handler) => handler());
    this.resubscribeAll();
  }

  private handleClose(): void {
    logger.warn("WebSocket disconnected");
    this.clearHeartbeatTimer();
    if (this.state !== "DISCONNECTED") {
      this.setState("RECONNECTING");
    }
    this.disconnectionHandlers.forEach((handler) => handler());
    this.scheduleReconnect();
  }

  private handleError(error: unknown): void {
    logger.error("WebSocket error", { error });
    this.errorHandlers.forEach((handler) => handler(error));
  }

  private handleRawMessage(event: MessageEvent): void {
    this.lastMessageAt = Date.now();
    const raw = normalizeEventData(event.data);

    try {
      const parsed = JSON.parse(raw);
      const outbound = wsOutboundSchema.safeParse(parsed);
      if (outbound.success) {
        this.handleServerOutbound(outbound.data);
        return;
      }

      this.dispatch(parsed as WSMessage);
    } catch (error) {
      logger.error("Error parsing WebSocket message", { error });
    }
  }

  private handleServerOutbound(outbound: ServerOutbound): void {
    switch (outbound.type) {
      case "PRICE_UPDATE":
        this.dispatch({
          type: "PRICE_UPDATE",
          payload: { symbol: outbound.symbol, price: outbound.price },
          timestamp: outbound.time,
        });
        break;
      case "STATUS":
        if (outbound.message !== "HEARTBEAT") {
          this.dispatch({ type: "STATUS", payload: { message: outbound.message }, timestamp: Date.now() });
        }
        break;
      case "ERROR":
        this.dispatch({ type: "ERROR", payload: { error: outbound.message, code: outbound.code }, timestamp: Date.now() });
        break;
      case "SUBSCRIPTIONS":
        this.subscribedSymbols = new Set(outbound.symbols);
        this.dispatch({ type: "SUBSCRIPTIONS", payload: { symbols: outbound.symbols }, timestamp: Date.now() });
        break;
      case "ALERT":
        this.dispatch({
          type: "ALERT",
          payload: {
            id: outbound.id,
            symbol: outbound.symbol,
            price: outbound.price,
            timestamp: outbound.timestamp,
            condition: outbound.condition,
          },
          timestamp: outbound.timestamp,
        });
        break;
      case "SERVICE_STATE":
        this.dispatch({
          type: "SERVICE_STATE",
          payload: outbound.payload,
          timestamp: outbound.timestamp ?? Date.now(),
        });
        break;
      default:
        break;
    }
  }

  private dispatch(message: WSMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        logger.error("Error in message handler", { error });
      }
    });
  }

  private send(message: ClientInbound): void {
        const payload = wsInboundSchema.parse(message);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      logger.debug("Queueing message until connection is open", { type: message.type });
    }
  }

  private startHeartbeatTimer(): void {
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastMessageAt > HEARTBEAT_TIMEOUT_MS) {
        logger.warn("Heartbeat timeout reached, forcing reconnect");
        this.forceReconnect();
      } else {
        this.send({ type: "PING", payload: {} });
      }
    }, 10000);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private forceReconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.scheduleReconnect(0);
  }

  private scheduleReconnect(delayOverride?: number): void {
    this.clearReconnectTimer();
    if (this.state === "DISCONNECTED") {
      return;
    }
    const attemptDelay = delayOverride ?? Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.reconnectAttempts);
    const jitter = Math.round(Math.random() * 250);
    const delay = attemptDelay + jitter;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts += 1;
      logger.info("Reconnecting WebSocket", { attempt: this.reconnectAttempts, delay });
      this.openSocket(true);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) {
      return;
    }
    this.state = next;
    this.stateHandlers.forEach((handler) => {
      try {
        handler(next);
      } catch (error) {
        logger.error("Error in state handler", { error });
      }
    });
  }
}

export const wsClient = new WebSocketClient();

function normalizeEventData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data.buffer as ArrayBuffer);
  }

  return String(data);
}
