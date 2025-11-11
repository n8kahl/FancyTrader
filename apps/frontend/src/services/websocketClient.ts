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

  const subscribe = (symbols: string[]) =>
    send({ type: "SUBSCRIBE", payload: { symbols } });

  const unsubscribe = (symbols: string[]) =>
    send({ type: "UNSUBSCRIBE", payload: { symbols } });

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

// --- Singleton client export for existing imports ---
function deriveDefaultWsUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/^http/, "ws");
    return `${origin}/ws`;
  }
  return "wss://fancy-trader.up.railway.app/ws";
}

const WS_URL =
  ((typeof import.meta !== "undefined" ? (import.meta as any)?.env : undefined) as any)
    ?.VITE_BACKEND_WS_URL || deriveDefaultWsUrl();

export const wsClient = createWebSocketClient(WS_URL);

export type { ServerOutbound, ServerInbound } from "@fancytrader/shared";
