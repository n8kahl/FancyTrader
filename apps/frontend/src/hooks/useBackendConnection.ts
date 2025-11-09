import { useEffect, useState, useCallback, useMemo } from "react";
import type { WSMessage, ConnectionState } from "../services/websocketClient";
import type { BackendSetup } from "../services/apiClient";
import type { Trade } from "@/types/trade";
import { getBackendUrl } from "../utils/env";
import { tradeStatusSchema, type ServiceState } from "@fancytrader/shared";
import { getBackendConnectionDeps, type BackendConnectionDependencies } from "./backendConnectionDeps";

interface BackendConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  trades: Trade[];
  lastUpdate: number | null;
  connectionState: ConnectionState;
  serviceState?: ServiceState;
}

export type ConnectionBannerState =
  | "connecting"
  | "healthy"
  | "degraded"
  | "offline"
  | "error"
  | "closed";

export function useBackendConnection(
  autoConnect = true,
  deps?: BackendConnectionDependencies
) {
  const { apiClient, wsClient, toast, logger } = deps ?? getBackendConnectionDeps();
  logger.info("🔌 useBackendConnection initialized", { autoConnect });

  const [state, setState] = useState<BackendConnectionState>({
    isConnected: wsClient.getConnectionState() === "CONNECTED",
    isLoading: true,
    error: null,
    trades: [],
    lastUpdate: null,
    connectionState: wsClient.getConnectionState(),
    serviceState: undefined,
  });

  /**
   * Fetch initial setups from API
   */
  const fetchSetups = useCallback(async () => {
    try {
      logger.info("Fetching setups from backend...");
      const setups = await apiClient.getSetups();
      const normalized = setups.map(transformSetupToTrade);

      setState((prev) => ({
        ...prev,
        trades: normalized,
        lastUpdate: Date.now(),
        isLoading: false,
      }));

      logger.info(`Loaded ${normalized.length} setups from backend`);
    } catch (error) {
      logger.error("Failed to fetch setups:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      }));
    }
  }, [apiClient, logger]);

  const handleServiceState = useCallback((payload: ServiceState) => {
    setState((prev) => ({
      ...prev,
      serviceState: payload,
    }));

    if (payload.status === "degraded" && payload.reason === "max_connections") {
      toast.warning("Live feed unavailable (provider limit)", {
        description:
          "Polygon connection limit reached. The backend will retry automatically; REST routes remain available.",
      });
    }
  }, [toast]);

  /**
   * Handle setup updates
   */
  const handleSetupUpdate = useCallback((payload: {
    action?: string;
    setup?: BackendSetup;
    setups?: BackendSetup[];
    targetIndex?: number;
  }) => {
    const { action, setup, setups } = payload;

    setState((prev) => {
      let updatedTrades = [...prev.trades];

      switch (action) {
        case "new":
          // Add new setup
          if (setup) {
            const trade = transformSetupToTrade(setup);
            updatedTrades = [trade, ...updatedTrades];

            toast.success("New Setup Detected!", {
              description: `${setup.symbol} - ${formatSetupName(setup.setupType)}`,
            });
          }
          break;

        case "update":
          // Update existing setup
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex((t) => t.id === trade.id);

            if (index !== -1) {
              updatedTrades[index] = trade;
            }
          }
          break;

        case "target_hit":
          // Target hit notification
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex((t) => t.id === trade.id);

            if (index !== -1) {
              updatedTrades[index] = trade;
            }

            const targetIndex = payload.targetIndex ?? 0;
            toast.success("Target Hit! 🎯", {
              description: `${setup.symbol} - Target ${targetIndex + 1}`,
            });
          }
          break;

        case "stop_loss":
          // Stop loss hit
          if (setup) {
            const trade = transformSetupToTrade(setup);
            const index = updatedTrades.findIndex((t) => t.id === trade.id);

            if (index !== -1) {
              updatedTrades[index] = { ...trade, status: "CLOSED" };
            }

            toast.error("Stop Loss Hit", {
              description: `${setup.symbol}`,
            });
          }
          break;

        default:
          // Bulk update (initial load)
          if (setups && Array.isArray(setups)) {
            updatedTrades = setups.map(transformSetupToTrade);
          }
      }

      return {
        ...prev,
        trades: updatedTrades,
        lastUpdate: Date.now(),
      };
    });
  }, [toast]);

  /**
   * Handle price updates
   */
  const handlePriceUpdate = useCallback((payload: { symbol: string; price: number }) => {
    const { symbol, price } = payload;

    setState((prev) => {
      const updatedTrades = prev.trades.map((trade) => {
        if (trade.symbol === symbol) {
          return {
            ...trade,
            currentPrice: price,
            // Recalculate P/L if trade is active
            ...(trade.entryPrice && {
              profitLoss: calculateProfitLoss(trade, price),
              profitLossPercent: calculateProfitLossPercent(trade, price),
            }),
          };
        }
        return trade;
      });

      return {
        ...prev,
        trades: updatedTrades,
        lastUpdate: Date.now(),
      };
    });
  }, []);

  /**
   * Handle WebSocket messages
   */
  const handleMessage = useCallback((message: WSMessage) => {
    logger.debug("WebSocket message received:", message.type);

    switch (message.type) {
      case "SETUP_UPDATE":
        if (message.payload && typeof message.payload === "object") {
          handleSetupUpdate(message.payload as {
            action?: string;
            setup?: BackendSetup;
            setups?: BackendSetup[];
            targetIndex?: number;
          });
        }
        break;

      case "PRICE_UPDATE":
        if (message.payload && typeof message.payload === "object") {
          handlePriceUpdate(message.payload as { symbol: string; price: number });
        }
        break;

      case "SERVICE_STATE":
        if (message.payload && typeof message.payload === "object") {
          handleServiceState(message.payload as ServiceState);
        }
        break;

      case "ERROR": {
        const errorMessage = extractErrorPayload(message.payload);
        logger.error("WebSocket error:", { error: errorMessage });
        toast.error("WebSocket Error", {
          description: errorMessage ?? "Unknown WebSocket error",
        });
        break;
      }

      default:
        logger.debug("Unhandled message type:", message.type);
    }
  }, [handlePriceUpdate, handleServiceState]);


  /**
   * Subscribe to symbols
   */
  const subscribeToSymbols = useCallback((symbols: string[]) => {
    if (symbols.length > 0) {
      wsClient.subscribe(symbols);
      logger.info(`Subscribed to ${symbols.length} symbols`);
    }
  }, [wsClient]);

  /**
   * Unsubscribe from symbols
   */
  const unsubscribeFromSymbols = useCallback((symbols: string[]) => {
    if (symbols.length > 0) {
      wsClient.unsubscribe(symbols);
      logger.info(`Unsubscribed from ${symbols.length} symbols`);
    }
  }, [wsClient]);

  /**
   * Initialize connection
   */
  useEffect(() => {
    if (!autoConnect) return;


    const initialize = async () => {
      try {
        await apiClient.checkHealth();
        logger.info("✅ Backend health check passed");
        wsClient.connect();
        await fetchSetups();
      } catch (error) {
        logger.error("❌ Backend health check failed:", error);
        const message = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: message || "Backend not available",
          isLoading: false,
        }));
        toast.error("Backend Connection Failed", {
          description: `Cannot connect to ${getBackendUrl()}. Check console for details.`,
          duration: 6000,
        });
      }
    };

    void initialize();

    // Register WebSocket handlers
    const unsubscribeMessage = wsClient.onMessage(handleMessage);
    const unsubscribeState = wsClient.onStateChange((next) => {
      setState((prev) => ({
        ...prev,
        connectionState: next,
        isConnected: next === "CONNECTED",
        error: next === "CONNECTED" ? null : prev.error,
      }));

      if (next === "CONNECTED") {
        wsClient.resubscribeAll();
        toast.success("Connected to Backend");
      } else if (next === "RECONNECTING") {
        toast.warning("Backend Disconnected", {
          description: "Attempting to reconnect...",
        });
      }
    });

    const unsubscribeError = wsClient.onError((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("WebSocket error:", error);
      setState((prev) => ({ ...prev, error: message || "WebSocket error" }));
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeState();
      unsubscribeError();
      wsClient.close();
    };
  }, [autoConnect, handleMessage, fetchSetups, apiClient, wsClient, toast]);

  const manualReconnectHandler = useCallback(() => {
    if (typeof wsClient.manualReconnect === "function") {
      wsClient.manualReconnect();
    } else {
      wsClient.close();
      wsClient.connect();
    }
  }, [wsClient]);

  const connectionMeta = useMemo(
    () => deriveConnectionStatus(state.connectionState, state.serviceState, state.error),
    [state.connectionState, state.serviceState, state.error]
  );

  return {
    ...state,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    refreshSetups: fetchSetups,
    connectionStatus: connectionMeta.state,
    connectionReason: connectionMeta.reason,
    manualReconnect: manualReconnectHandler,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function transformSetupToTrade(setup: BackendSetup): Trade {
  const entryPrice = setup.entryPrice ?? setup.entry;
  const currentPrice = setup.currentPrice ?? entryPrice ?? 0;
  const targets = Array.isArray(setup.targets) ? setup.targets : [];
  const primaryTarget = targets[0];

  return {
    id: setup.id,
    symbol: setup.symbol,
    setup: setup.setupType?.replace(/_/g, " + ") || "Unknown Setup",
    status: resolveTradeStatus(setup.status),
    direction: setup.direction,
    price: currentPrice,
    change: setup.change ?? 0,
    changePercent: setup.changePercent ?? 0,
    entry: entryPrice,
    target: primaryTarget,
    stop: setup.stopLoss,
    riskReward: setup.riskReward || setup.riskRewardRatio,
    entryPrice,
    currentPrice,
    stopLoss: setup.stopLoss,
    targets,
    profitLoss: typeof setup.profitLoss === "number" ? setup.profitLoss : undefined,
    profitLossPercent: typeof setup.profitLossPercent === "number" ? setup.profitLossPercent : undefined,
    confluenceScore: setup.confluenceScore || 0,
    confluenceFactors: setup.confluenceFactors || [],
    confluenceDetails: setup.confluenceDetails || {},
    conviction: setup.conviction,
    timeframe: setup.timeframe || "5m",
    dayType: setup.dayType,
    marketPhase: setup.marketPhase || setup.phase,
    timestamp: setup.timestamp || Date.now(),
    indicators: setup.indicators || {},
    patientCandle: setup.patientCandle,
    tradeState: "SETUP",
    alertHistory: [],
  };
}

function calculateProfitLoss(trade: Trade, currentPrice: number): number {
  if (!trade.entryPrice) return 0;

  const direction = trade.direction === "LONG" ? 1 : -1;
  const entry = Number(trade.entryPrice);
  const price = Number(currentPrice);
  return (price - entry) * direction;
}

function calculateProfitLossPercent(trade: Trade, currentPrice: number): number {
  if (!trade.entryPrice) return 0;

  const pl = calculateProfitLoss(trade, currentPrice);
  const entry = Number(trade.entryPrice) || 1;
  return (pl / entry) * 100;
}

function extractErrorPayload(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;
    return typeof maybeError === "string" ? maybeError : undefined;
  }
  return undefined;
}

function resolveTradeStatus(status?: string | null): Trade['status'] {
  if (!status) {
    return 'MONITORING';
  }
  const result = tradeStatusSchema.safeParse(status);
  return result.success ? result.data : 'MONITORING';
}

function formatSetupName(setupType?: string): string {
  return setupType ? setupType.replace(/_/g, ' ') : 'Unknown setup';
}

function deriveConnectionStatus(
  connectionState: ConnectionState,
  serviceState?: ServiceState,
  error?: string | null
): { state: ConnectionBannerState; reason: string | null } {
  let derived: ConnectionBannerState = "connecting";
  let reason: string | null = null;

  switch (connectionState) {
    case "CONNECTED":
      derived = "healthy";
      break;
    case "DISCONNECTED":
      derived = "closed";
      break;
    case "RECONNECTING":
      derived = "connecting";
      reason = "Reconnecting…";
      break;
    case "CONNECTING":
    default:
      derived = "connecting";
      break;
  }

  if (serviceState?.status === "degraded") {
    derived = "degraded";
    reason = serviceState.reason ?? reason;
  } else if (serviceState?.status === "offline") {
    derived = "offline";
    reason = serviceState.reason ?? reason;
  }

  if (error && derived !== "healthy") {
    derived = "error";
    reason = error;
  }

  return { state: derived, reason };
}
