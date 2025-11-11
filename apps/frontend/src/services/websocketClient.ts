import { BACKEND_CONFIG } from "../config/backend";
import type { ServerOutbound } from "@fancytrader/shared";

type SubPayload = { symbols: string[] };

export type WSOutbound =
  | { type: "SUBSCRIBE"; payload: SubPayload }
  | { type: "UNSUBSCRIBE"; payload: SubPayload }
  | { type: "PING"; payload?: Record<string, never> };

type Listener = (msg: any) => void;

export function createWebSocketClient(url: string) {
  let ws: WebSocket | null = null;
  let listeners: Listener[] = [];
  let heartbeat: number | null = null;

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      send({ type: "PING", payload: {} });
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        listeners.forEach((l) => l(data));
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setTimeout(connect, 1_000);
    };

    if (heartbeat) clearInterval(heartbeat);
    heartbeat = window.setInterval(() => {
      send({ type: "PING", payload: {} });
    }, 25_000);
  };

  const send = (msg: WSOutbound) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  };

  const subscribe = (symbols: string[]) => send({ type: "SUBSCRIBE", payload: { symbols } });

  const unsubscribe = (symbols: string[]) => send({ type: "UNSUBSCRIBE", payload: { symbols } });

  const onMessage = (fn: Listener) => {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  };

  const close = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    ws?.close();
    ws = null;
  };

  return { connect, subscribe, unsubscribe, onMessage, close };
}

// --- Singleton wrapper for convenience imports and diagnostics consumers ---
/**
 * Public message type re-exported for hooks/tests that need to narrow messages.
 * Includes server outbound messages + simple status/error frames from backend.
 */
export type WSMessage =
  | ServerOutbound
  | { type: "status"; message: string }
  | { type: "error"; message: string; code?: string }
  | { type: "SUBSCRIPTIONS"; symbols: string[] };

/**
 * Build a module-level client and decorate it with a few convenience helpers
 * expected by diagnostics and docs: onConnect, onError, getConnectionStatus, disconnect.
 */
const _base = createWebSocketClient(BACKEND_CONFIG.wsUrl);

type Unsub = () => void;
type VoidFn = () => void;
type ErrFn = (e: unknown) => void;

let _isConnected = false;
const _connectHandlers = new Set<VoidFn>();
const _errorHandlers = new Set<ErrFn>();

let _sawStatusMessage = false;
const _unsubStatus = _base.onMessage((msg: WSMessage) => {
  if (!_sawStatusMessage && msg && (msg as any).type === "status") {
    _sawStatusMessage = true;
    _isConnected = true;
    for (const fn of _connectHandlers) fn();
  }
});

const _origConnect = _base.connect.bind(_base);
function _connect(): void {
  try {
    _origConnect();
  } catch (e) {
    for (const fn of _errorHandlers) fn(e);
    throw e;
  }
}

function _disconnect(): void {
  _isConnected = false;
  _sawStatusMessage = false;
  _unsubStatus();
  _base.close();
}

function _onConnect(fn: VoidFn): Unsub {
  _connectHandlers.add(fn);
  return () => _connectHandlers.delete(fn);
}

function _onError(fn: ErrFn): Unsub {
  _errorHandlers.add(fn);
  return () => _errorHandlers.delete(fn);
}

function _getConnectionStatus(): boolean {
  return _isConnected;
}

export const wsClient = {
  connect: _connect,
  close: _base.close,
  subscribeToSymbols: _base.subscribe,
  unsubscribeFromSymbols: _base.unsubscribe,
  onMessage: _base.onMessage,
  disconnect: _disconnect,
  onConnect: _onConnect,
  onError: _onError,
  getConnectionStatus: _getConnectionStatus,
};

export type { ServerOutbound, ServerInbound } from "@fancytrader/shared";
