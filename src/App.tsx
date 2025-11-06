import { useState, useEffect } from "react";
import { TradeCard, type Trade } from "./components/TradeCard";
import { TradeListItem } from "./components/TradeListItem";
import { TradeDetailsModal } from "./components/TradeDetailsModal";
import { DiscordAlertDialog } from "./components/DiscordAlertDialog";
import { MarketPhaseIndicator } from "./components/MarketPhaseIndicator";
import { StrategySettings } from "./components/StrategySettings";
import { WatchlistManager } from "./components/WatchlistManager";
import { OptionsContractSelector } from "./components/OptionsContractSelector";
import { TradeProgressManager } from "./components/TradeProgressManager";
import { ActiveTradesPanel } from "./components/ActiveTradesPanel";
import { BackendSetupGuide } from "./components/BackendSetupGuide";
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
  ListPlus,
  Sun,
  Moon,
  Wifi,
  WifiOff
} from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { ALL_STRATEGIES } from "./config/strategies";
import { DEFAULT_WATCHLIST, type WatchlistSymbol } from "./config/watchlist";
import { type OptionsContract, type AlertType, type TradeAlert, type PositionTracking, calculatePositionPL } from "./types/options";
import { generateMockTrades } from "./utils/mockTradeGenerator";
import { useBackendConnection } from "./hooks/useBackendConnection";
import { displayWelcomeMessage } from "./utils/welcomeMessage";

// Mock trade data with new confluence system (fallback)
const mockTrades: Trade[] = generateMockTrades();

// Display welcome message on app load
if (typeof window !== 'undefined') {
  displayWelcomeMessage();
}

export default function App() {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [alertTrade, setAlertTrade] = useState<Trade | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMobile, setIsMobile] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showStrategySettings, setShowStrategySettings] = useState(false);
  const [showWatchlistManager, setShowWatchlistManager] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("kcu-theme");
    return saved ? saved === "dark" : true; // Default to dark
  });
  const [enabledStrategies, setEnabledStrategies] = useState<string[]>(
    ALL_STRATEGIES.map(s => s.id) // All enabled by default
  );
  const [watchlist, setWatchlist] = useState<WatchlistSymbol[]>(() => {
    // Load watchlist from localStorage on initial render
    const saved = localStorage.getItem("kcu-watchlist");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_WATCHLIST;
      }
    }
    return DEFAULT_WATCHLIST;
  });
  
  // Backend connection
  const { 
    isConnected, 
    isLoading,
    error: backendError,
    trades: backendTrades,
    subscribeToSymbols,
    unsubscribeFromSymbols,
  } = useBackendConnection(!useMockData);
  
  // Options Trading State
  const [contractSelectorTrade, setContractSelectorTrade] = useState<Trade | null>(null);
  const [tradeProgressTrade, setTradeProgressTrade] = useState<Trade | null>(null);
  
  // Use backend trades or mock trades
  const [trades, setTrades] = useState<Trade[]>(() => 
    mockTrades.map(trade => ({
      ...trade,
      tradeState: trade.tradeState || "SETUP",
      alertHistory: trade.alertHistory || [],
    }))
  );

  // Update trades when backend data changes
  useEffect(() => {
    if (!useMockData && backendTrades.length > 0) {
      setTrades(backendTrades);
    } else if (useMockData) {
      // Reset to mock trades when switching to mock mode
      setTrades(mockTrades.map(trade => ({
        ...trade,
        tradeState: trade.tradeState || "SETUP",
        alertHistory: trade.alertHistory || [],
      })));
    }
  }, [backendTrades, useMockData]);

  // Subscribe to watchlist symbols when connected
  useEffect(() => {
    if (isConnected && !useMockData) {
      const symbols = watchlist.filter(w => w.enabled).map(w => w.symbol);
      if (symbols.length > 0) {
        subscribeToSymbols(symbols);
      }
    }

    return () => {
      if (isConnected && !useMockData) {
        const symbols = watchlist.map(w => w.symbol);
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
      setIsMobile(mobile);
      
      // Auto-switch to list view on mobile, restore preference on desktop
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

  const getFilteredTrades = () => {
    let filtered = trades;
    
    // Apply strategy filter
    filtered = filtered.filter(trade => {
      // Find matching strategy by name
      const matchingStrategy = ALL_STRATEGIES.find(s => 
        trade.setup?.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(trade.setup?.toLowerCase() || "")
      );
      
      return matchingStrategy ? enabledStrategies.includes(matchingStrategy.id) : true;
    });
    
    // Apply watchlist filter if on watchlist tab
    if (activeTab === "watchlist") {
      const watchlistSymbols = watchlist.map(w => w.symbol);
      filtered = filtered.filter(t => watchlistSymbols.includes(t.symbol));
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(trade =>
        trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.setup?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status tab filter
    switch (activeTab) {
      case "active":
        filtered = filtered.filter(t => ["ACTIVE", "PARTIAL_EXIT"].includes(t.status));
        break;
      case "ready":
        filtered = filtered.filter(t => t.status === "SETUP_READY");
        break;
      case "monitoring":
        filtered = filtered.filter(t => ["MONITORING", "SETUP_FORMING"].includes(t.status));
        break;
    }

    // Sort by priority
    const statusPriority: Record<string, number> = {
      "ACTIVE": 1,
      "PARTIAL_EXIT": 2,
      "SETUP_READY": 3,
      "SETUP_FORMING": 4,
      "MONITORING": 5,
      "CLOSED": 6,
      "DISMISSED": 7,
      "REENTRY_SETUP": 8,
    };

    return filtered.sort((a, b) => {
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;
      return aPriority - bPriority;
    });
  };

  const filteredTrades = getFilteredTrades();
  const activeTrades = trades.filter(t => 
    t.optionsContract && 
    (t.status === "ACTIVE" || t.status === "PARTIAL_EXIT" || t.tradeState === "LOADED" || t.tradeState === "ENTERED")
  );

  const handleSendAlert = (trade: Trade) => {
    setAlertTrade(trade);
  };

  const handleAlertSent = (type: AlertType, template: string, customMessage?: string) => {
    if (!alertTrade) return;

    const alert: TradeAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      template,
      customMessage,
      contractPrice: alertTrade.position?.currentPremium,
    };

    setTrades(prev => prev.map(t => 
      t.id === alertTrade.id
        ? { ...t, alertHistory: [...t.alertHistory, alert] }
        : t
    ));

    toast.success(`Discord alert sent for ${alertTrade.symbol}`, {
      description: `Alert type: ${type}`,
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

    setTrades(prev => prev.map(t => 
      t.id === contractSelectorTrade.id ? updatedTrade : t
    ));

    toast.success(`Contract loaded for ${contractSelectorTrade.symbol}`, {
      description: `${contract.strike}${contract.type === "CALL" ? "C" : "P"} ${contract.expirationDisplay}`,
    });

    setContractSelectorTrade(null);
    
    // Open the trade progress manager immediately after loading contract
    setTradeProgressTrade(updatedTrade);
  };

  const handleStrategyToggle = (strategyId: string, enabled: boolean) => {
    setEnabledStrategies(prev => 
      enabled 
        ? [...prev, strategyId]
        : prev.filter(id => id !== strategyId)
    );
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = ALL_STRATEGIES.filter(s => {
      // Implement preset logic based on presetId
      return true; // For now, enable all
    });
    setEnabledStrategies(preset.map(s => s.id));
  };

  const handleAddToWatchlist = (symbols: WatchlistSymbol[]) => {
    setWatchlist(prev => {
      const existing = new Set(prev.map(w => w.symbol));
      const newSymbols = symbols.filter(s => !existing.has(s.symbol));
      return [...prev, ...newSymbols];
    });
    
    toast.success(`Added ${symbols.length} symbol(s) to watchlist`);
  };

  const handleRemoveFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    toast.success(`Removed ${symbol} from watchlist`);
  };

  const handleSendProgressAlert = (type: AlertType, message: string, data?: any) => {
    if (!tradeProgressTrade) return;

    const alert: TradeAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      contractPrice: tradeProgressTrade.position?.currentPremium,
      profitLoss: data?.profitLoss,
      profitLossPercent: data?.profitLossPercent,
    };

    // Update trade with new alert
    setTrades(prev => prev.map(t => 
      t.id === tradeProgressTrade.id
        ? { ...t, alertHistory: [...t.alertHistory, alert] }
        : t
    ));

    // Update the tradeProgressTrade state so the modal reflects the new alert
    setTradeProgressTrade(prev => {
      if (!prev) return null;
      return { ...prev, alertHistory: [...prev.alertHistory, alert] };
    });

    toast.success(`Discord alert sent for ${tradeProgressTrade.symbol}`, {
      description: `Alert type: ${type}`,
    });
  };

  const handleDismissTrade = (tradeId: string) => {
    setTrades(prev => prev.map(t => 
      t.id === tradeId
        ? { ...t, status: "DISMISSED" as const }
        : t
    ));
    
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      toast.success(`Trade dismissed`, {
        description: `${trade.symbol} removed from active trades`,
      });
    }
  };

  const handleUpdateTradeState = (tradeId: string, newState: "LOADED" | "ENTERED" | "ACTIVE" | "CLOSED") => {
    setTrades(prev => prev.map(t => {
      if (t.id !== tradeId) return t;
      
      // Update the trade state
      const updatedTrade = { 
        ...t, 
        tradeState: newState,
        status: newState === "CLOSED" ? "CLOSED" as const : t.status
      };
      
      // If updating the current tradeProgressTrade, update it too
      if (tradeProgressTrade?.id === tradeId) {
        setTradeProgressTrade(updatedTrade);
      }
      
      return updatedTrade;
    }));
    
    const trade = trades.find(t => t.id === tradeId);
    if (trade && newState === "ENTERED") {
      toast.success(`Position entered`, {
        description: `${trade.symbol} - Now managing active position`,
      });
    }
  };

  const stats = {
    total: filteredTrades.length,
    active: filteredTrades.filter(t => t.status === "ACTIVE").length,
    ready: filteredTrades.filter(t => t.status === "SETUP_READY").length,
    monitoring: filteredTrades.filter(t => t.status === "MONITORING").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl flex items-center gap-2">
                <Activity className="w-7 h-7 text-primary" />
                Fancy Trader
              </h1>
              <p className="text-sm text-muted-foreground">
                KCU Real-time LTP Setup Monitor & Discord Alerts
                {!useMockData && (
                  <span className="ml-2">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 text-green-500">
                        <Wifi className="w-3 h-3" /> Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-500">
                        <WifiOff className="w-3 h-3" /> Connecting...
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseMockData(!useMockData)}
                title={useMockData ? "Switch to Live Data" : "Switch to Mock Data"}
              >
                {useMockData ? (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Go Live
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 mr-2" />
                    Mock
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWatchlistManager(true)}
              >
                <ListPlus className="w-4 h-4 mr-2" />
                Watchlist
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStrategySettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Strategies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-9 h-9 p-0"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <MarketPhaseIndicator />
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol or setup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("grid");
                  localStorage.setItem("kcu-view-mode", "grid");
                }}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("list");
                  localStorage.setItem("kcu-view-mode", "list");
                }}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="w-full space-y-4">
            {/* Backend Setup Guide - Only show when trying to use live data but backend not connected */}
            {!useMockData && !isConnected && !isLoading && backendError && (
              <BackendSetupGuide 
                onSwitchToMock={() => setUseMockData(true)}
                onDismiss={() => setUseMockData(true)}
              />
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  All <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  Active <Badge variant="secondary" className="ml-1">{stats.active}</Badge>
                </TabsTrigger>
                <TabsTrigger value="ready" className="flex items-center gap-2">
                  Ready <Badge variant="secondary" className="ml-1">{stats.ready}</Badge>
                </TabsTrigger>
                <TabsTrigger value="monitoring" className="flex items-center gap-2">
                  Monitor <Badge variant="secondary" className="ml-1">{stats.monitoring}</Badge>
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="flex items-center gap-2">
                  Watchlist <Badge variant="secondary" className="ml-1">{watchlist.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No trades found matching your criteria</p>
                  </div>
                ) : (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTrades.map((trade) => (
                          <TradeCard
                            key={trade.id}
                            trade={trade}
                            onViewDetails={setSelectedTrade}
                            onSendAlert={handleSendAlert}
                            onLoadContract={handleLoadContract}
                            onManageTrade={handleManageTrade}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTrades.map((trade) => (
                          <TradeListItem
                            key={trade.id}
                            trade={trade}
                            isExpanded={expandedItems.has(trade.id)}
                            onToggleExpand={(id) => {
                              setExpandedItems(prev => {
                                const next = new Set(prev);
                                if (next.has(id)) {
                                  next.delete(id);
                                } else {
                                  next.add(id);
                                }
                                return next;
                              });
                            }}
                            onViewDetails={setSelectedTrade}
                            onSendAlert={handleSendAlert}
                            onLoadContract={handleLoadContract}
                            onManageTrade={handleManageTrade}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
        </div>
      </main>
      
      {/* Active Trades Bottom Panel */}
      {activeTrades.length > 0 && (
        <ActiveTradesPanel
          trades={activeTrades}
          onViewDetails={(trade) => setSelectedTrade(trade)}
          onManageTrade={handleManageTrade}
          onSendAlert={handleSendAlert}
        />
      )}

      {/* Modals */}
      <TradeDetailsModal
        trade={selectedTrade}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onSendAlert={handleSendAlert}
      />

      <DiscordAlertDialog
        trade={alertTrade}
        isOpen={!!alertTrade}
        onClose={() => setAlertTrade(null)}
        onSend={handleAlertSent}
      />

      <StrategySettings
        open={showStrategySettings}
        onOpenChange={setShowStrategySettings}
        enabledStrategies={enabledStrategies}
        onStrategiesChange={setEnabledStrategies}
      />

      <WatchlistManager
        open={showWatchlistManager}
        onOpenChange={setShowWatchlistManager}
        watchlist={watchlist}
        onWatchlistChange={setWatchlist}
      />

      {contractSelectorTrade && (
        <OptionsContractSelector
          trade={contractSelectorTrade}
          open={!!contractSelectorTrade}
          onOpenChange={(open) => !open && setContractSelectorTrade(null)}
          onSelectContract={handleContractSelected}
        />
      )}

      {tradeProgressTrade && tradeProgressTrade.optionsContract && tradeProgressTrade.position && (
        <TradeProgressManager
          trade={tradeProgressTrade}
          open={!!tradeProgressTrade}
          onOpenChange={(open) => !open && setTradeProgressTrade(null)}
          contract={tradeProgressTrade.optionsContract}
          position={tradeProgressTrade.position}
          alertHistory={tradeProgressTrade.alertHistory || []}
          onSendAlert={handleSendProgressAlert}
          onUpdateTradeState={handleUpdateTradeState}
          onDismissTrade={handleDismissTrade}
        />
      )}
    </div>
  );
}
