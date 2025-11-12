import { useCallback, useEffect, useMemo, useState } from "react";
import { backendConnectionDefaults } from "./backendConnectionDefaults";
import { getBackendConnectionDeps, setBackendConnectionDeps } from "./backendConnectionDeps";
import type { BackendConnectionDependencies } from "./backendConnectionDeps";
import type { WSMessage } from "../services/websocketClient";

/** Exported for ConnectionStatus component props */
export type ConnectionBannerState =
  | "healthy"
  | "degraded"
  | "offline"
  | "error"
  | "closed"
  | "connecting"
  | "reconnecting";

function formatSetupName(type?: string) {
  return type?.replace(/_/g, " + ") || "Unknown Setup";
}

function toTrade(setup: any) {
  const entryPrice = setup.entryPrice ?? setup.entry;
  const currentPrice = setup.currentPrice ?? entryPrice ?? 0;
  return {
    ...setup,
    setup: formatSetupName(setup.setupType),
    currentPrice,
    entryPrice,
    price: currentPrice,
  };
}

type ServiceState = {
  status?: string;
  reason?: string;
  source?: string;
  timestamp?: number;
};

export function useBackendConnection(autoConnect = true, deps?: BackendConnectionDependencies) {
  const { wsClient, apiClient, toast } = useMemo(() => {
    if (deps) {
      setBackendConnectionDeps(deps);
      return getBackendConnectionDeps();
    }
    return getBackendConnectionDeps(backendConnectionDefaults);
  }, [deps]);

  const [connected, setConnected] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(autoConnect);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState("DISCONNECTED");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionBannerState>("connecting");
  const [connectionReason, setConnectionReason] = useState<string | null>(null);
  const [serviceState, setServiceState] = useState<ServiceState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const addOrUpdateTrade = useCallback(
    (setup: any) => {
      const trade = toTrade(setup);
      setTrades((prev) => {
        const idx = prev.findIndex((item) => item.id === trade.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...trade };
          return next;
        }
        return [trade, ...prev];
      });
    },
    []
  );

  const handleSetupUpdate = useCallback(
    (payload: any) => {
      if (!payload) return;
      if (Array.isArray(payload.setups)) {
        setTrades((payload.setups as any[]).map((setup) => toTrade(setup)));
        return;
      }
      const setup = payload.setup;
      if (!setup) return;
      addOrUpdateTrade(setup);
      setLastUpdate(Date.now());
      if (payload.action === "target_hit") {
        toast.success("Target Hit! 🎯", {
          description: `${setup.symbol ?? "Trade"} - Target ${(payload.targetIndex ?? 0) + 1}`,
        });
      }
      if (payload.action === "stop_loss") {
        toast.error("Stop Loss Hit", { description: setup.symbol ?? "Trade" });
        setTrades((prev) =>
          prev.map((trade) =>
            trade.id === setup.id ? { ...trade, status: "CLOSED" as const } : trade
          )
        );
      }
    },
    [addOrUpdateTrade, toast]
  );

  const handlePriceUpdate = useCallback((payload: any) => {
    if (!payload?.symbol || payload.price === undefined) return;
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.symbol !== payload.symbol) return trade;
        const entry = trade.entryPrice ?? trade.entry;
        const currentPrice = payload.price;
        const profitLoss = typeof entry === "number" ? Number((currentPrice - entry).toFixed(2)) : undefined;
        return {
          ...trade,
          currentPrice,
          price: currentPrice,
          profitLoss,
          profitLossPercent:
            profitLoss !== undefined && entry
              ? Number(((profitLoss / entry) * 100).toFixed(2))
              : trade.profitLossPercent,
        };
      })
    );
    setLastUpdate(Date.now());
  }, []);

  const handleServiceState = useCallback(
    (payload: ServiceState | null | undefined) => {
      if (!payload) return;
      setServiceState(payload);
      const status = payload.status === "degraded" ? "degraded" : "healthy";
      setConnectionStatus(status);
      setConnectionReason(payload.reason ?? null);
      if (payload.status === "degraded") {
        const sourceLabel = payload.source
          ? payload.source.replace(/^(.)/, (match) => match.toUpperCase())
          : "Provider";
        toast.warning("Live feed unavailable (provider limit)", {
          description: sourceLabel,
        });
      }
    },
    [toast]
  );

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      setLastMessage(msg);
      const type = msg?.type?.toString();
      if (type === "SETUP_UPDATE") {
        handleSetupUpdate(msg.payload);
      } else if (type === "PRICE_UPDATE") {
        handlePriceUpdate(msg.payload);
      } else if (type === "SERVICE_STATE") {
        handleServiceState(msg.payload as ServiceState | null);
    } else if (type === "error") {
      toast.error("WebSocket Error", { description: "Unknown WebSocket error" });
      setError("Unknown WebSocket error");
      setConnectionStatus("error");
    }
    },
    [handlePriceUpdate, handleSetupUpdate, handleServiceState, toast]
  );

  const handleStateChange = useCallback(
    (state: string) => {
      setConnectionState(state);
      if (state === "RECONNECTING") {
        toast.warning("Backend Disconnected", { description: "Attempting to reconnect..." });
      }
    },
    [toast]
  );

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown WebSocket error";
      toast.error("WebSocket Error", { description: message });
      setError(message);
      setConnectionStatus("error");
    },
    [toast]
  );

  useEffect(() => {
    if (!autoConnect) {
      setIsLoading(false);
      return () => undefined;
    }

    let alive = true;
    (async () => {
      try {
        const initial = await apiClient.getSetups();
        if (alive) {
          setTrades(initial);
          setError(null);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "failed to load setups");
        }
      } finally {
        if (alive) setIsLoading(false);
      }
      try {
        await apiClient.checkHealth();
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "offline");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [apiClient, autoConnect]);

  useEffect(() => {
    if (!autoConnect) return () => undefined;

    wsClient.connect();
    const offMsg = wsClient.onMessage(handleMessage);
    const offState = wsClient.onStateChange((state) => {
      const normalized = (state?.toString() ?? "").toUpperCase();
      if (normalized === "CONNECTED") setConnected(true);
      if (normalized === "DISCONNECTED") setConnected(false);
      handleStateChange(normalized);
    });
    const offErr = wsClient.onError(handleError);

    return () => {
      offMsg();
      offState();
      offErr();
      wsClient.close?.();
    };
  }, [autoConnect, handleError, handleMessage, handleStateChange, wsClient]);

  const subscribeToSymbols = useCallback(
    (symbols: string[]) => {
      if (!symbols.length) return;
      wsClient.subscribe(symbols);
      setSubscriptions((prev) => Array.from(new Set([...prev, ...symbols])));
    },
    [wsClient]
  );

  const unsubscribeFromSymbols = useCallback(
    (symbols: string[]) => {
      if (!symbols.length) return;
      wsClient.unsubscribe(symbols);
      setSubscriptions((prev) => prev.filter((symbol) => !symbols.includes(symbol)));
    },
    [wsClient]
  );

  const manualReconnect = useCallback(() => {
    wsClient.manualReconnect?.();
  }, [wsClient]);

  return {
    connected,
    connectionState,
    connectionStatus,
    connectionReason,
    lastMessage,
    serviceState,
    lastUpdate,
    isLoading,
    error,
    trades,
    subscriptions,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    isConnected: connected,
    manualReconnect,
  };
}

export function useConnectionStatus(_skipRealtime?: boolean, _deps?: BackendConnectionDependencies) {
  const { connectionStatus, connectionReason, manualReconnect } = useBackendConnection();
  return { connectionStatus, connectionReason, manualReconnect };
}
