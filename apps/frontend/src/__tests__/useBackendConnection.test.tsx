import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { BackendSetup } from "../services/apiClient";
import { useBackendConnection } from "../hooks/useBackendConnection";
import type { BackendConnectionDependencies } from "../hooks/backendConnectionDeps";
import type { ConnectionState, WSMessage } from "../services/websocketClient";

const baseSetup: BackendSetup = {
  id: "trade-1",
  symbol: "AAPL",
  setupType: "ORB_PC",
  status: "SETUP_READY",
  entryPrice: 100,
  targets: [110],
};


type HandlerSet<T> = Set<(value: T) => void>;


function createHarness(initialState: ConnectionState = "DISCONNECTED") {
  const wsHandlers: {
    message: HandlerSet<WSMessage>;
    state: HandlerSet<ConnectionState>;
    error: HandlerSet<unknown>;
  } = {
    message: new Set(),
    state: new Set(),
    error: new Set(),
  };

  const connectionStateRef = { value: initialState };

  const apiClient = {
    getSetups: vi.fn<() => Promise<BackendSetup[]>>().mockResolvedValue([baseSetup]),
    checkHealth: vi.fn<() => Promise<{ ok: boolean }>>().mockResolvedValue({ ok: true }),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  };

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const wsClient = {
    connect: vi.fn(),
    close: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    resubscribeAll: vi.fn(),
    onMessage: vi.fn((handler: (message: WSMessage) => void) => {
      wsHandlers.message.add(handler);
      return () => wsHandlers.message.delete(handler);
    }),
    onStateChange: vi.fn((handler: (state: ConnectionState) => void) => {
      wsHandlers.state.add(handler);
      handler(connectionStateRef.value);
      return () => wsHandlers.state.delete(handler);
    }),
    onError: vi.fn((handler: (error: unknown) => void) => {
      wsHandlers.error.add(handler);
      return () => wsHandlers.error.delete(handler);
    }),
    getConnectionState: vi.fn(() => connectionStateRef.value),
    getConnectionStatus: vi.fn(() => connectionStateRef.value === "CONNECTED"),
  };

  const emitWsMessage = (message: WSMessage) => {
    wsHandlers.message.forEach((handler) => handler(message));
  };

  const emitWsError = (error: unknown) => {
    wsHandlers.error.forEach((handler) => handler(error));
  };

  const updateConnectionState = (state: ConnectionState) => {
    connectionStateRef.value = state;
    wsHandlers.state.forEach((handler) => handler(state));
  };

  const deps: BackendConnectionDependencies = {
    apiClient,
    wsClient,
    toast,
    logger,
  };

  return {
    deps,
    apiClient,
    wsClient,
    toast,
    logger,
    emitWsMessage,
    emitWsError,
    updateConnectionState,
  };
}

/**
 * Vitest + JSDOM on Node 22 frequently runs out of memory when executing this suite.
 * CI and local dev are pinned to Node 20 via .nvmrc, so we only skip when the
 * current runtime is already beyond that range.
 */
const isNode22Plus = Number(process.versions.node.split(".")[0]) >= 22;
const describeHook = isNode22Plus ? describe.skip : describe;

describeHook("useBackendConnection", () => {
  it("hydrates setups and reacts to WebSocket events", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trades).toHaveLength(1);
    expect(result.current.trades[0].symbol).toBe("AAPL");

    act(() => harness.updateConnectionState("CONNECTED"));
    expect(result.current.connectionState).toBe("CONNECTED");

    act(() => {
      harness.emitWsMessage({
        type: "SETUP_UPDATE",
        payload: { action: "new", setup: { id: "beta", symbol: "MSFT", setupType: "EMA_BOUNCE" } },
      });
    });
    expect(result.current.trades[0].symbol).toBe("MSFT");

    act(() => {
      harness.emitWsMessage({
        type: "PRICE_UPDATE",
        payload: { symbol: "MSFT", price: 125 },
      });
    });

    await waitFor(() => expect(result.current.trades[0].currentPrice).toBe(125));
    expect(result.current.lastUpdate).not.toBeNull();
  });

  it("handles backend health check failures", async () => {
    const harness = createHarness();
    harness.apiClient.checkHealth.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.error).toBe("offline"));
    expect(result.current.isLoading).toBe(false);
  });

  it("wires subscribe helpers to the websocket client", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      result.current.subscribeToSymbols(["TSLA"]);
      result.current.unsubscribeFromSymbols(["TSLA"]);
    });

    expect(harness.wsClient.subscribe).toHaveBeenCalledWith(["TSLA"]);
    expect(harness.wsClient.unsubscribe).toHaveBeenCalledWith(["TSLA"]);
  });

  it("handles target and stop-loss updates with notifications", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      harness.emitWsMessage({
        type: "SETUP_UPDATE",
        payload: {
          action: "target_hit",
          setup: { id: "trade-1", symbol: "AAPL", setupType: "ORB_PC" },
          targetIndex: 1,
        },
      });
    });

    expect(harness.toast.success).toHaveBeenCalledWith(
      "Target Hit! 🎯",
      expect.objectContaining({ description: "AAPL - Target 2" })
    );

    act(() => {
      harness.emitWsMessage({
        type: "SETUP_UPDATE",
        payload: {
          action: "stop_loss",
          setup: { id: "trade-1", symbol: "AAPL", setupType: "ORB_PC" },
        },
      });
    });

    await waitFor(() => expect(result.current.trades[0].status).toBe("CLOSED"));
    expect(harness.toast.error).toHaveBeenCalledWith(
      "Stop Loss Hit",
      expect.objectContaining({ description: "AAPL" })
    );
  });

  it("applies bulk payloads and surfaces websocket errors", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      harness.emitWsMessage({
        type: "SETUP_UPDATE",
        payload: {
          setups: [
            { id: "bulk-1", symbol: "SPY", setupType: "EMA_BOUNCE" },
            { id: "bulk-2", symbol: "QQQ", setupType: "ORB_PC" },
          ],
        },
      });
    });

    expect(result.current.trades).toHaveLength(2);
    expect(result.current.trades[0].symbol).toBe("SPY");

    act(() => {
      harness.emitWsMessage({
        type: "ERROR",
        payload: { error: "Too many requests" },
      });
    });

    expect(harness.toast.error).toHaveBeenCalledWith(
      "WebSocket Error",
      expect.objectContaining({ description: "Too many requests" })
    );
  });

  it("captures service state updates when the feed degrades", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      harness.emitWsMessage({
        type: "SERVICE_STATE",
        payload: {
          source: "polygon",
          status: "degraded",
          reason: "max_connections",
          timestamp: Date.now(),
        },
      });
    });

    await waitFor(() => expect(result.current.serviceState?.status).toBe("degraded"));
    expect(harness.toast.warning).toHaveBeenCalledWith(
      "Live feed unavailable (provider limit)",
      expect.objectContaining({ description: expect.stringContaining("Polygon") })
    );
  });

  it("updates trades when receiving incremental updates", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      harness.emitWsMessage({
        type: "SETUP_UPDATE",
        payload: {
          action: "update",
          setup: {
            id: "trade-1",
            symbol: "AAPL",
            setupType: "EMA_BREAK",
            status: "ACTIVE",
            currentPrice: 140,
          },
        },
      });
    });

    expect(result.current.trades[0].setup).toBe("EMA + BREAK");
    expect(result.current.trades[0].status).toBe("ACTIVE");
  });

  it("ignores empty symbol arrays and unhandled messages", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.subscribeToSymbols([]);
      result.current.unsubscribeFromSymbols([]);
      harness.emitWsMessage({ type: "PING", payload: { foo: "bar" } });
    });

    expect(harness.wsClient.subscribe).not.toHaveBeenCalled();
    expect(harness.wsClient.unsubscribe).not.toHaveBeenCalled();
    expect(result.current.trades).toHaveLength(1);
  });

  it("reports reconnect warnings and websocket errors", async () => {
    const harness = createHarness();
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => harness.updateConnectionState("RECONNECTING"));
    expect(harness.toast.warning).toHaveBeenCalledWith(
      "Backend Disconnected",
      expect.objectContaining({ description: "Attempting to reconnect..." })
    );

    act(() => harness.emitWsError(new Error("socket boom")));
    await waitFor(() => expect(result.current.error).toBe("socket boom"));
  });

  it("safely ignores malformed websocket payloads", async () => {
    const harness = createHarness();
    renderHook(() => useBackendConnection(true, harness.deps));

    act(() => {
      harness.emitWsMessage({ type: "SETUP_UPDATE", payload: null as unknown as WSMessage["payload"] });
      harness.emitWsMessage({ type: "PRICE_UPDATE", payload: undefined as unknown as WSMessage["payload"] });
      harness.emitWsMessage({ type: "ERROR", payload: { message: "not-typed" } });
    });

    expect(harness.toast.error).toHaveBeenCalledWith(
      "WebSocket Error",
      expect.objectContaining({ description: "Unknown WebSocket error" })
    );
  });

  it("handles price updates for trades without entry price", async () => {
    const harness = createHarness();
    harness.apiClient.getSetups.mockResolvedValueOnce([
      { id: "trade-2", symbol: "AMD", setupType: "EMA", status: "SETUP_READY" },
    ]);
    const { result } = renderHook(() => useBackendConnection(true, harness.deps));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      harness.emitWsMessage({ type: "PRICE_UPDATE", payload: { symbol: "AMD", price: 200 } });
    });

    expect(result.current.trades[0].currentPrice).toBe(200);
    expect(result.current.trades[0].profitLoss).toBeUndefined();
  });

  it("respects the autoConnect flag", () => {
    const harness = createHarness();
    renderHook(() => useBackendConnection(false, harness.deps));
    expect(harness.apiClient.checkHealth).not.toHaveBeenCalled();
    expect(harness.wsClient.connect).not.toHaveBeenCalled();
  });
});
