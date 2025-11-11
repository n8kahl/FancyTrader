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
