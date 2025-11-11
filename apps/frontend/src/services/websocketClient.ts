import { getBackendWsUrl } from "../utils/env";

/** What other modules expect (e.g. useAlerts.ts, tests) */
export type WSMessage = { type: string; payload?: unknown; [k: string]: unknown };

export type ConnectionState = "connecting" | "connected" | "disconnected" | "closing" | "error";

type Unsubscribe = () => void;

type Listener = (msg: WSMessage) => void;

type StateListener = (state: ConnectionState) => void;
type ErrorListener = (err: unknown) => void;

export function createWebSocketClient(wsUrl?: string) {
  let ws: WebSocket | null = null;
  let connected = false;
  let state: ConnectionState = "disconnected";

  const messageHandlers = new Set<Listener>();
  const stateHandlers = new Set<StateListener>();
  const errorHandlers = new Set<ErrorListener>();

  let pendingSymbols = new Set<string>();
  let backoffMs = 250;

  const notifyState = (s: ConnectionState) => {
    state = s;
    for (const h of stateHandlers) h(s);
  };

  const resubscribeAll = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pendingSymbols.size === 0) return;
    ws.send(
      JSON.stringify({
        type: "SUBSCRIBE",
        payload: { symbols: Array.from(pendingSymbols) },
      })
    );
  };

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = wsUrl || getBackendWsUrl();
    notifyState("connecting");
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      connected = true;
      backoffMs = 250;
      notifyState("connected");
      resubscribeAll();
    });

    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WSMessage;
        for (const h of messageHandlers) h(msg);
      } catch (e) {
        // swallow malformed messages
      }
    });

    ws.addEventListener("error", (err) => {
      for (const h of errorHandlers) h(err);
      notifyState("error");
    });

    ws.addEventListener("close", () => {
      connected = false;
      notifyState("disconnected");

      setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, 4000);
        connect();
      }, backoffMs);
    });
  };

  const close = () => {
    if (ws) {
      notifyState("closing");
      ws.close();
      ws = null;
      connected = false;
      notifyState("disconnected");
    }
  };

  const disconnect = () => {
    close();
  };

  const subscribe = (symbols: string[]) => {
    for (const s of symbols) pendingSymbols.add(s);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "SUBSCRIBE", payload: { symbols } }));
    }
  };

  const unsubscribe = (symbols: string[]) => {
    for (const s of symbols) pendingSymbols.delete(s);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "UNSUBSCRIBE", payload: { symbols } }));
    }
  };

  const onMessage = (handler: Listener): Unsubscribe => {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  };

  const onStateChange = (handler: StateListener): Unsubscribe => {
    stateHandlers.add(handler);
    return () => stateHandlers.delete(handler);
  };

  const onError = (handler: ErrorListener): Unsubscribe => {
    errorHandlers.add(handler);
    return () => errorHandlers.delete(handler);
  };

  const manualReconnect = () => {
    disconnect();
    connect();
  };

  const getConnectionState = () => state;
  const getConnectionStatus = () => connected;

  return {
    connect,
    close,
    disconnect,
    manualReconnect,
    subscribe,
    unsubscribe,
    resubscribeAll,
    onMessage,
    onStateChange,
    onError,
    getConnectionState,
    getConnectionStatus,
  };
}

export const wsClient = createWebSocketClient(getBackendWsUrl());
