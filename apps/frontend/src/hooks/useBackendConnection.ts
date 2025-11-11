import { useEffect, useMemo, useState } from "react";
import { createWebSocketClient, type WSMessage } from "../services/websocketClient";
import { getBackendConnectionDeps } from "./backendConnectionDeps";

/** Exported for ConnectionStatus component props */
export type ConnectionBannerState =
  | "healthy"
  | "degraded"
  | "offline"
  | "error"
  | "closed"
  | "connecting";

/** Reuse the deps type without re-declaring it */
export type BackendConnectionDependencies =
  import("./backendConnectionDeps").BackendConnectionDependencies;

function computeBanner(
  connected: boolean,
  last: WSMessage | null
): { state: ConnectionBannerState; reason?: string } {
  let state: ConnectionBannerState = connected ? "healthy" : "connecting";
  let reason: string | undefined;

  if (last?.type === "SERVICE_STATE") {
    const s = (last as any)?.payload?.status;
    if (s === "offline") {
      state = "offline";
      reason = "Data provider offline";
    } else if (s === "healthy") {
      state = connected ? "healthy" : "connecting";
    }
  }

  if (last?.type === "error") {
    state = "error";
    reason = (last as any)?.message || "Unknown error";
  }

  return { state, reason };
}

const defaultDeps = getBackendConnectionDeps();

export function useBackendConnection() {
  const deps = defaultDeps;
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  const client = useMemo(() => createWebSocketClient(deps.wsUrl), [deps.wsUrl]);

  useEffect(() => {
    client.connect();

    const offMsg = client.onMessage((msg) => {
      setLastMessage(msg);
      if (msg?.type === "status") {
        const ok = Array.isArray((msg as any).payload)
          ? (msg as any).payload.some((p: any) => p?.status === "connected")
          : false;
        if (ok) setConnected(true);
      }
    });

    const offState = client.onStateChange((st) => {
      if (st === "open") setConnected(true);
      if (st === "closed") setConnected(false);
    });

    const offErr = client.onError(() => {});

    return () => {
      offMsg();
      offState();
      offErr();
      client.close(1000, "cleanup");
    };
  }, [client]);

  const subscribe = (symbols: string[]) => {
    client.subscribe(symbols);
    setSubscriptions((prev) => Array.from(new Set([...prev, ...symbols])));
  };

  const unsubscribe = (symbols: string[]) => {
    client.unsubscribe(symbols);
    setSubscriptions((prev) => prev.filter((s) => !symbols.includes(s)));
  };

  const manualReconnect: (..._args: any[]) => void = () => {
    client.close(4001, "manual_reconnect");
    client.connect();
  };

  const banner = computeBanner(connected, lastMessage);

  return {
    connected,
    lastMessage,
    subscriptions,
    subscribe,
    unsubscribe,
    isConnected: connected,
    isLoading: false,
    error: undefined as unknown as Error | undefined,
    trades: [] as any[],
    subscribeToSymbols: subscribe,
    unsubscribeFromSymbols: unsubscribe,
    connectionStatus: banner.state,
    connectionReason: banner.reason,
    manualReconnect,
  };
}

export function useConnectionStatus(
  _skipRealtime?: boolean,
  _deps?: BackendConnectionDependencies
) {
  const { connectionStatus, connectionReason, manualReconnect } = useBackendConnection();
  return { connectionStatus, connectionReason, manualReconnect };
}
