import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Public types the rest of the app expects */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface UseBackendConnectionReturn {
  /** true when the WS is open */
  isConnected: boolean;
  /** true while we’re establishing a connection */
  isLoading: boolean;
  /** last error message if any */
  error: string | null;

  /** human-friendly status + reason message (what the UI shows) */
  connectionStatus: ConnectionStatus;
  connectionReason: string | null;

  /** lightweight store for live trade ticks your UI consumes */
  trades: any[];

  /** subscribe/unsubscribe helpers your UI calls */
  subscribeToSymbols: (symbols: string[]) => void;
  unsubscribeFromSymbols: (symbols: string[]) => void;

  /** manual reconnect action (button in UI) */
  manualReconnect: () => void;
}

/** Optional dependencies you can feed the hook (advanced) */
export interface BackendConnectionDeps {
  wsUrl?: string;
}
/** ✅ Back-compat alias for your App.tsx */
export type BackendConnectionDependencies = BackendConnectionDeps;

/** Overloads so both zero-arg and (boolean, deps) calls are valid */
export function useBackendConnection(): UseBackendConnectionReturn;
export function useBackendConnection(enableLive?: boolean, deps?: BackendConnectionDeps): UseBackendConnectionReturn;

/** Implementation */
export function useBackendConnection(enableLive: boolean = true, deps: BackendConnectionDeps = {}): UseBackendConnectionReturn {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [reason, setReason] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subsRef = useRef<Set<string>>(new Set());

  const wsUrl = useMemo(() => {
    if (deps.wsUrl) return deps.wsUrl;
    const envUrl = (import.meta as any)?.env?.VITE_BACKEND_WS_URL as string | undefined;
    if (envUrl) return envUrl;
    const base = window.location.origin.replace(/^http/, "ws");
    return `${base}/ws`;
  }, [deps.wsUrl]);

  const cleanup = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (error) {
        console.error(error);
      }
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((obj: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(obj));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }, []);

  const subscribeToSymbols = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subsRef.current.add(s));
    send({ type: "SUBSCRIBE", payload: { symbols } });
  }, [send]);

  const unsubscribeFromSymbols = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subsRef.current.delete(s));
    send({ type: "UNSUBSCRIBE", payload: { symbols } });
  }, [send]);

  const manualReconnect = useCallback(() => {
    setReason("manual reconnect");
    cleanup();
    setStatus("disconnected");
  }, [cleanup]);

  useEffect(() => {
    if (!enableLive) {
      cleanup();
      setStatus("disconnected");
      setReason("live disabled");
      return;
    }

    setStatus("connecting");
    setReason("opening socket");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setReason("open");

      const existing = Array.from(subsRef.current);
      if (existing.length) {
        send({ type: "SUBSCRIBE", payload: { symbols: existing } });
      }
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === "SERVICE_STATE" || msg?.type === "status") {
          if (msg?.message) setReason(String(msg.message));
          return;
        }
        if (msg?.type === "SUBSCRIPTIONS") {
          return;
        }
        if (msg?.type === "TRADES" || msg?.type === "TRADE" || msg?.ev === "T") {
          setTrades((prev) => {
            const next = Array.isArray(msg?.payload) ? msg.payload : [msg.payload ?? msg];
            return next.concat(prev).slice(0, 500);
          });
          return;
        }
      } catch (e: any) {
        setErr((prev) => prev ?? e?.message ?? "message parse error");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setErr("websocket error");
      setReason("socket error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      setReason((r) => r ?? "socket closed");
      reconnectRef.current = setTimeout(() => {
        if (enableLive) {
          setStatus("connecting");
          setReason("reconnecting");
          cleanup();
          const next = new WebSocket(wsUrl);
          wsRef.current = next;
        }
      }, 1000);
    };

    return () => {
      cleanup();
    };
  }, [enableLive, wsUrl, cleanup, send]);

  return {
    isConnected: status === "connected",
    isLoading: status === "connecting",
    error: err,
    connectionStatus: status,
    connectionReason: reason,
    trades,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    manualReconnect,
  };
}
