import ConnectionStatus from "./components/ConnectionStatus";
import { HealthBanner } from "./components/HealthBanner";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { TradeCard } from "./components/TradeCard";
import type { Trade, TradeAlert } from "@/types/trade";
import { TradeListItem } from "./components/TradeListItem";
import { TradeDetailsModal } from "./components/TradeDetailsModal";
import { DiscordAlertDialog } from "./components/DiscordAlertDialog";
import { MarketPhaseIndicator } from "./components/MarketPhaseIndicator";
import { SessionIndicator } from "./components/SessionIndicator";
import { StrategySettings } from "./components/StrategySettings";
import { WatchlistManager } from "./components/WatchlistManager";
import { OptionsContractSelector } from "./components/OptionsContractSelector";
import { TradeProgressManager } from "./components/TradeProgressManager";
import { ActiveTradesPanel } from "./components/ActiveTradesPanel";
import { BackendSetupGuide } from "./components/BackendSetupGuide";
import { DiagnosticPanel } from "./components/DiagnosticPanel";
import { BackendConnectionTest } from "./components/BackendConnectionTest";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import {
  Search,
  TrendingUp,
  Activity,
  LayoutGrid,
  List,
  Settings,
  Plus,
  MinusCircle,
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { apiClient, ApiErrorEx } from "./services/apiClient";
import { ALL_STRATEGIES } from "./config/strategies";
import { DEFAULT_WATCHLIST } from "./config/watchlist";
import type { BackendConnectionDependencies } from "./hooks/backendConnectionDeps";
import {
  type OptionsContract,
  type AlertType,
  type PositionTracking,
} from "./types/options";
import { generateMockTrades } from "./utils/mockTradeGenerator";
import { useBackendConnection } from "./hooks/useBackendConnection";
import { useReadyz } from "./hooks/useReadyz";
import { useSession } from "./hooks/useSession";
import { displayWelcomeMessage } from "./utils/welcomeMessage";
import { logger } from "./utils/logger";
import { getMode, isDev, getBackendUrl, getBackendWsUrl } from "./utils/env";
import { DIAGNOSTICS_ENABLED } from "@/flags";
import { MockModeProvider } from "@/providers/mock/MockModeProvider";
import { runAction, type RunActionDeps } from "./flows/_shared/interaction";
import { getWatchlistActions } from "./flows/watchlistFlow";
import type { WatchlistActionId } from "./flows/watchlist_flow.schema";
import { getOnboardingActions } from "./flows/onboardingFlow";
import type { OnboardActionId } from "./flows/onboarding_flow.schema";

import type { TradeLite, WatchlistItem } from "@fancytrader/shared";

// Mock trade data with new confluence system (fallback)
const mockTrades: Trade[] = generateMockTrades();

type UiTrade = Trade & TradeLite;

type WatchlistEntry = WatchlistItem & {
  name: string;
  sector?: string;
  isActive: boolean;
  addedAt?: string;
};

interface AppProps {
  backendDeps?: BackendConnectionDependencies;
}

const DEFAULT_WATCHLIST_ENTRIES: WatchlistEntry[] = DEFAULT_WATCHLIST.map((item) => ({
  symbol: item.symbol,
  name: item.name,
  sector: item.sector,
  isActive: item.isActive,
  addedAt: item.addedAt,
}));

function isWatchlistEntryList(value: unknown): value is WatchlistEntry[] {
  return (
    Array.isArray(value) &&
    value.every((item) =>
      typeof item === "object" &&
      item !== null &&
      "symbol" in item &&
      typeof (item as Record<string, unknown>).symbol === "string"
    )
  );
}

function parseStoredWatchlist(raw: string): WatchlistEntry[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isWatchlistEntryList(parsed)) {
      return parsed;
    }
  } catch (error) {
    logger.warn("Failed to parse stored watchlist", { error });
  }
  return DEFAULT_WATCHLIST_ENTRIES;
}

const toUiTrade = (trade: Trade): UiTrade => ({
  ...trade,
  entryPrice: Number(trade.entryPrice ?? trade.entry ?? 0),
  stop: Number(trade.stop ?? trade.stopLoss ?? trade.entry ?? 0),
  target: Number(trade.target ?? trade.targets?.[0] ?? trade.entry ?? 0),
});

interface ProgressAlertPayload {
  profitLoss?: number;
  profitLossPercent?: number;
}


// Display welcome message on app load
if (typeof window !== "undefined") {
  displayWelcomeMessage();

  // Log startup info
  logger.info("🚀 Fancy Trader starting up...", {
    environment: getMode(),
    isDev: isDev(),
    backendUrl: getBackendUrl(),
    backendWsUrl: getBackendWsUrl(),
    userAgent: navigator.userAgent,
  });
}

export default function App({ backendDeps }: AppProps = {}) {
  logger.info("📱 App component mounting...");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [alertTrade, setAlertTrade] = useState<Trade | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showStrategySettings, setShowStrategySettings] = useState(false);
  const [showWatchlistManager, setShowWatchlistManager] = useState(false);
  const [showBackendTest, setShowBackendTest] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [dismissedFlows, setDismissedFlows] = useState(() => ({
    onboarding: typeof window !== "undefined" && localStorage.getItem("dismissed:onboarding") === "1",
  }));
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("kcu-theme");
    return saved ? saved === "dark" : true; // Default to dark
  });
  const [enabledStrategies, setEnabledStrategies] = useState<string[]>(
    ALL_STRATEGIES.map((s) => s.id) // All enabled by default
  );
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => {
    const saved = localStorage.getItem("kcu-watchlist");
    if (saved) {
      return parseStoredWatchlist(saved);
    }
    return DEFAULT_WATCHLIST_ENTRIES;
  });

  // Backend connection
  const {
    isConnected,
    isLoading,
    error: backendError,
    trades: backendTrades,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    connectionStatus,
    connectionReason,
    manualReconnect,
  } = useBackendConnection();

  const sessionInfo = useSession();
  const readyz = useReadyz(5000);
  const [announcement, setAnnouncement] = useState("");
  const wasDownRef = useRef(false);

  useEffect(() => {
    if (!readyz.loading) {
      if (wasDownRef.current && readyz.ready) {
        setAnnouncement("Realtime connection recovered");
      }
      wasDownRef.current = !readyz.ready;
    }
  }, [readyz.loading, readyz.ready]);

  // Options Trading State
  const [contractSelectorTrade, setContractSelectorTrade] = useState<Trade | null>(null);
  const [tradeProgressTrade, setTradeProgressTrade] = useState<Trade | null>(null);

  // Use backend trades or mock trades
  const [trades, setTrades] = useState<Trade[]>(() =>
    mockTrades.map((trade) => ({
      ...trade,
      tradeState: trade.tradeState || "SETUP",
      alertHistory: trade.alertHistory || [],
    }))
  );

  // Update trades when backend data changes
  useEffect(() => {
    if (!useMockData) {
      // Use backend data even if it’s empty (0 setups)
      logger.info(`📊 Using ${backendTrades.length} trades from backend`);
      setTrades(backendTrades);
    } else {
      // Mock mode explicitly requested by the user
      logger.info(`🎭 Using ${mockTrades.length} mock trades`);
      setTrades(
        mockTrades.map((trade) => ({
          ...trade,
          tradeState: trade.tradeState || "SETUP",
          alertHistory: trade.alertHistory || [],
        }))
      );
    }
  }, [backendTrades, useMockData]);

  // Subscribe to watchlist symbols when connected
  useEffect(() => {
    if (isConnected && !useMockData) {
      const symbols = watchlist.filter((w) => w.isActive !== false).map((w) => w.symbol);
      if (symbols.length > 0) {
        subscribeToSymbols(symbols);
      }
    }

    return () => {
      if (isConnected && !useMockData) {
        const symbols = watchlist.map((w) => w.symbol);
        unsubscribeFromSymbols(symbols);
      }
    };
  }, [isConnected, watchlist, useMockData, subscribeToSymbols, unsubscribeFromSymbols]);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("kcu-watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  // Apply theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kcu-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Detect mobile viewport and restore view preference
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;

      if (mobile) {
        setViewMode("list");
      } else {
        const savedView = localStorage.getItem("kcu-view-mode") as "grid" | "list" | null;
        if (savedView) {
          setViewMode(savedView);
        }
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getFilteredTrades = (): Trade[] => {
    let filtered: Trade[] = trades;

    // Apply strategy filter
    filtered = filtered.filter((trade) => {
      // Find matching strategy by name
      const matchingStrategy = ALL_STRATEGIES.find(
        (s) =>
          trade.setup?.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(trade.setup?.toLowerCase() || "")
      );

      return matchingStrategy ? enabledStrategies.includes(matchingStrategy.id) : true;
    });

    // Apply watchlist filter if on watchlist tab
    if (activeTab === "watchlist") {
      const watchlistSymbols = watchlist.map((w) => w.symbol);
      filtered = filtered.filter((t) => watchlistSymbols.includes(t.symbol));
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (trade) =>
          trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trade.setup?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status tab filter
    switch (activeTab) {
      case "active":
        filtered = filtered.filter((t) => ["ACTIVE", "PARTIAL_EXIT"].includes(t.status));
        break;
      case "ready":
        filtered = filtered.filter((t) => t.status === "SETUP_READY");
        break;
      case "monitoring":
        filtered = filtered.filter((t) => ["MONITORING", "SETUP_FORMING"].includes(t.status));
        break;
    }

    // Sort by priority
    const statusPriority: Record<string, number> = {
      ACTIVE: 1,
      PARTIAL_EXIT: 2,
      SETUP_READY: 3,
      SETUP_FORMING: 4,
      MONITORING: 5,
      CLOSED: 6,
      DISMISSED: 7,
      REENTRY_SETUP: 8,
    };

    return filtered.sort((a, b) => {
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;
      return aPriority - bPriority;
    });
  };

  const filteredTrades = getFilteredTrades();
const activeTrades: UiTrade[] = trades
  .filter(
    (t) =>
      t.status === "ACTIVE" ||
      t.status === "PARTIAL_EXIT" ||
      t.tradeState === "LOADED" ||
      t.tradeState === "ENTERED"
  )
  .map(toUiTrade);

  const watchlistBrowseActions = getWatchlistActions("browse");
  const watchlistBulkActions = getWatchlistActions("bulk");
  const onboardingFirstRunActions = getOnboardingActions("firstRun");
  const onboardingBackendActions = getOnboardingActions("backendCheck");

  const findTradeById = (tradeId: string): Trade | undefined =>
    trades.find((tradeItem) => tradeItem.id === tradeId);

  const appendAlertToTrade = (tradeId: string, alert: TradeAlert) => {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId ? { ...t, alertHistory: [...(t.alertHistory ?? []), alert] } : t
      )
    );
    setTradeProgressTrade((prev) =>
      prev?.id === tradeId ? { ...prev, alertHistory: [...(prev.alertHistory ?? []), alert] } : prev
    );
  };

  const handleSendAlert = (trade: Trade) => {
    setAlertTrade(trade);
  };

  const requestWatchlistSymbol = (message: string): string | null => {
    if (typeof window === "undefined") return null;
    const value = window.prompt(message);
    return value ? value.trim().toUpperCase() : null;
  };

  const addSymbolToWatchlist = async (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    if (watchlist.some((entry) => entry.symbol === normalized)) {
      toast.info(`${normalized} is already on your watchlist`);
      return;
    }
    try {
      await apiClient.addToWatchlist(normalized);
      const entry: WatchlistEntry = {
        symbol: normalized,
        name: normalized,
        isActive: true,
        addedAt: new Date().toISOString(),
      };
      setWatchlist((prev) => [...prev, entry]);
      toast.success(`Added ${normalized} to watchlist`);
    } catch (error) {
      logger.error("Failed to add watchlist symbol", error);
      toast.error(`Unable to add ${normalized}`);
    }
  };

  const removeSymbolFromWatchlist = async (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    if (!watchlist.some((entry) => entry.symbol === normalized)) {
      toast.info(`${normalized} is not on your watchlist`);
      return;
    }
    try {
      await apiClient.removeFromWatchlist(normalized);
      setWatchlist((prev) => prev.filter((entry) => entry.symbol !== normalized));
      toast.success(`Removed ${normalized} from watchlist`);
    } catch (error) {
      logger.error("Failed to remove watchlist symbol", error);
      toast.error(`Unable to remove ${normalized}`);
    }
  };

  const handleWatchlistAction = async (action: WatchlistActionId) => {
    switch (action) {
      case "openManager":
        setShowWatchlistManager(true);
        return;
      case "add": {
        const symbol = requestWatchlistSymbol("Enter a symbol to add to your watchlist");
        if (symbol) {
          await addSymbolToWatchlist(symbol);
        }
        return;
      }
      case "remove": {
        const symbol = requestWatchlistSymbol("Enter a symbol to remove from your watchlist");
        if (symbol) {
          await removeSymbolFromWatchlist(symbol);
        }
        return;
      }
      case "bulkEnable":
      case "bulkDisable": {
        const next = action === "bulkEnable";
        setWatchlist((prev) => prev.map((entry) => ({ ...entry, isActive: next })));
        toast.success(next ? "Enabled all watchlist symbols" : "Disabled all watchlist symbols");
        return;
      }
      default:
        return;
    }
  };

  const dismissFlow = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`dismissed:${key}`, "1");
    }
    setDismissedFlows((prev) => ({ ...prev, [key]: true }));
  };

  const mapAlertTypeToShareType = (type: AlertType):
    | "ENTRY"
    | "TRIM_25"
    | "TRIM_50"
    | "ADD"
    | "STOP_LOSS"
    | "TARGET_HIT"
    | "EXIT_ALL"
    | "CUSTOM" => {
    switch (type) {
      case "LOAD":
      case "ENTRY":
        return "ENTRY";
      case "TRIM_25":
        return "TRIM_25";
      case "TRIM_50":
        return "TRIM_50";
      case "ADD":
        return "ADD";
      case "STOP_ADJUST":
        return "STOP_LOSS";
      case "TARGET_HIT":
        return "TARGET_HIT";
      case "EXIT_ALL":
        return "EXIT_ALL";
      case "CUSTOM":
      default:
        return "CUSTOM";
    }
  };

  const shareTradeAlert = async (
    trade: Trade,
    type: AlertType,
    message: string,
    extra?: Partial<TradeAlert>,
  ) => {
    await apiClient.shareCustomDiscord({
      symbol: trade.symbol,
      type: mapAlertTypeToShareType(type),
      content: message,
    });

    const alert: TradeAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      template: message,
      contractPrice: trade.position?.currentPremium,
      ...extra,
    };

    appendAlertToTrade(trade.id, alert);

    return alert;
  };

  const handlePresetDiscordAction = async (
    tradeId: string,
    subtype: string,
    text?: string,
  ) => {
    const trade = findTradeById(tradeId);
    if (!trade) {
      toast.error("Unable to locate that trade");
      return;
    }
    try {
      await shareTradeAlert(trade, subtype as AlertType, text ?? `${trade.symbol} ${subtype}`);
      toast.success(`Discord alert sent for ${trade.symbol}`, {
        description: `Alert type: ${subtype}`,
      });
    } catch (error) {
      handleDiscordError(error);
    }
  };

  const handleDiscordError = (error: unknown) => {
    const disabled = error instanceof ApiErrorEx && error.code === "DISCORD_DISABLED";
    if (disabled) {
      toast.error("Discord is disabled. Set DISCORD_ENABLED=true and configure DISCORD_WEBHOOK_URL.");
    } else {
      logger.error("Failed to send Discord alert", error);
      toast.error("Failed to send Discord alert");
    }
  };

  const handleAlertSent = async (payload: { channel: string; content: string }) => {
    if (!alertTrade) return;

    try {
      await apiClient.shareCustomDiscord({
        symbol: alertTrade.symbol,
        type: "CUSTOM",
        content: payload.content,
      });
    } catch (error) {
      handleDiscordError(error);
    }

    const alert: TradeAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "CUSTOM",
      message: payload.content,
      template: payload.content,
      contractPrice: alertTrade.position?.currentPremium,
    };

    appendAlertToTrade(alertTrade.id, alert);

    toast.success(`Discord alert sent for ${alertTrade.symbol}`, {
      description: `Channel: ${payload.channel}`,
    });

    setAlertTrade(null);
  };

  const handleLoadContract = (trade: Trade) => {
    setContractSelectorTrade(trade);
  };

  const handleManageTrade = (trade: Trade) => {
    setTradeProgressTrade(trade);
  };

  const handleContractSelected = (contract: OptionsContract) => {
    if (!contractSelectorTrade) return;

    // Calculate initial position
    const position: PositionTracking = {
      entryPremium: contract.premium,
      currentPremium: contract.premium,
      realizedPL: 0,
      unrealizedPL: 0,
      totalPL: 0,
      totalPLPercent: 0,
      positionSize: 1.0,
    };

    const updatedTrade = {
      ...contractSelectorTrade,
      status: "ACTIVE" as const,
      tradeState: "LOADED" as const,
      optionsContract: contract,
      position,
    };

    setTrades((prev) => prev.map((t) => (t.id === contractSelectorTrade.id ? updatedTrade : t)));

    toast.success(`Contract loaded for ${contractSelectorTrade.symbol}`, {
      description: `${contract.strike}${contract.type === "CALL" ? "C" : "P"} ${contract.expirationDisplay}`,
    });

    setContractSelectorTrade(null);

    // Open the trade progress manager immediately after loading contract
    setTradeProgressTrade(updatedTrade);
  };

  const handleSendProgressAlert = async (
    type: AlertType,
    message: string,
    data?: ProgressAlertPayload
  ) => {
    if (!tradeProgressTrade) return;

    try {
      await shareTradeAlert(tradeProgressTrade, type, message, {
        profitLoss: data?.profitLoss,
        profitLossPercent: data?.profitLossPercent,
      });
    } catch (error) {
      handleDiscordError(error);
      return;
    }

    toast.success(`Discord alert sent for ${tradeProgressTrade.symbol}`, {
      description: `Alert type: ${type}`,
    });
  };

  const renderTradeCard = (trade: Trade): ReactNode => {
    const normalizedTrade = toUiTrade(trade);
    return (
      <TradeCard
        key={normalizedTrade.id}
        trade={normalizedTrade}
        onViewDetails={(selected) => setSelectedTrade(selected)}
        onLoadContract={handleLoadContract}
        onManageTrade={handleManageTrade}
      />
    );
  };

  const renderTradeListItem = (trade: Trade): ReactNode => {
    const normalizedTrade = toUiTrade(trade);
    return (
      <TradeListItem
        key={normalizedTrade.id}
        trade={normalizedTrade}
        isExpanded={expandedItems.has(normalizedTrade.id)}
        onToggleExpand={(id, expanded) => {
          setExpandedItems((prev) => {
            const next = new Set(prev);
            if (expanded) {
              next.add(id);
            } else {
              next.delete(id);
            }
            return next;
          });
        }}
        onViewDetails={(selected) => setSelectedTrade(selected)}
        onLoadContract={handleLoadContract}
        onManageTrade={handleManageTrade}
        onSendAlert={handleSendAlert}
      />
    );
  };

  const flowDeps: RunActionDeps = {
    openManageTrade: (tradeId) => {
      const trade = findTradeById(tradeId);
      if (trade) {
        setTradeProgressTrade(trade);
      }
    },
    openDetails: (tradeId) => {
      const trade = findTradeById(tradeId);
      if (trade) {
        setSelectedTrade(trade);
      }
    },
    openWatchlistManager: () => setShowWatchlistManager(true),
    openStrategySettings: () => setShowStrategySettings(true),
    sendDiscordCustom: async (tradeId) => {
      const trade = findTradeById(tradeId);
      if (trade) {
        setAlertTrade(trade);
      }
    },
    sendDiscordType: async (tradeId, subtype, text) => {
      await handlePresetDiscordAction(tradeId, subtype, text);
    },
    openBackendTest: () => setShowBackendTest(true),
    openSetupGuide: () => setShowSetupGuide(true),
    dismiss: (key) => dismissFlow(key),
  };

  const renderWatchlistActionButton = (action: WatchlistActionId): JSX.Element | null => {
    switch (action) {
      case "openManager":
        return (
          <Button variant="outline" size="sm" key="watchlist-open" onClick={() => setShowWatchlistManager(true)}>
            <List className="w-4 h-4 mr-2" />
            Watchlist
          </Button>
        );
      case "add":
        return (
          <Button
            variant="outline"
            size="sm"
            key="watchlist-add"
            onClick={() => {
              void handleWatchlistAction("add");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Symbol
          </Button>
        );
      case "remove":
        return (
          <Button
            variant="outline"
            size="sm"
            key="watchlist-remove"
            onClick={() => {
              void handleWatchlistAction("remove");
            }}
          >
            <MinusCircle className="w-4 h-4 mr-2" />
            Remove
          </Button>
        );
      default:
        return null;
    }
  };

  const handleDismissTrade = (tradeId: string) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? { ...t, status: "DISMISSED" as const } : t))
    );

    const trade = trades.find((t) => t.id === tradeId);
    if (trade) {
      toast.success(`Trade dismissed`, {
        description: `${trade.symbol} removed from active trades`,
      });
    }
  };

  const handleUpdateTradeState = (tradeId: string, newState: Trade["tradeState"]) => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== tradeId) return t;

        // Update the trade state
        const updatedTrade = {
          ...t,
          tradeState: newState,
          status: newState === "CLOSED" ? ("CLOSED" as const) : t.status,
        };

        // If updating the current tradeProgressTrade, update it too
        if (tradeProgressTrade?.id === tradeId) {
          setTradeProgressTrade(updatedTrade);
        }

        return updatedTrade;
      })
    );

    const trade = trades.find((t) => t.id === tradeId);
    if (trade && newState === "ENTERED") {
      toast.success(`Position entered`, {
        description: `${trade.symbol} - Now managing active position`,
      });
    }
  };

  const stats = {
    total: filteredTrades.length,
    active: filteredTrades.filter((t) => t.status === "ACTIVE").length,
    ready: filteredTrades.filter((t) => t.status === "SETUP_READY").length,
    monitoring: filteredTrades.filter((t) => t.status === "MONITORING").length,
  };

  const healthStatus = readyz.loading ? "unknown" : readyz.ready ? "healthy" : "down";
  const healthReason = readyz.error ?? sessionInfo.error ?? undefined;
  const hiddenBanner = sessionInfo.session === "closed";

  return (
    <MockModeProvider>
      <div className="min-h-screen">
        {/* app content renders here (routes/layout) */}
        <Toaster />
      </div>
    </MockModeProvider>
  );
}
