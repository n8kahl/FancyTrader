import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Check,
  AlertCircle,
  TrendingUp,
  X,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { 
  POPULAR_SYMBOLS, 
  sortWatchlist,
  type WatchlistSymbol 
} from "../config/watchlist";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface WatchlistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchlist: WatchlistSymbol[];
  onWatchlistChange: (watchlist: WatchlistSymbol[]) => void;
}

export function WatchlistManager({ 
  open, 
  onOpenChange, 
  watchlist, 
  onWatchlistChange 
}: WatchlistManagerProps) {
  
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"symbol" | "sector" | "recent">("symbol");
  const [error, setError] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const symbolInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus symbol input when dialog opens
  useEffect(() => {
    if (open && symbolInputRef.current) {
      setTimeout(() => symbolInputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAddSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    
    if (!symbol) {
      setError("Symbol is required");
      return;
    }

    // Validate symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(symbol)) {
      setError("Symbol must be 1-5 uppercase letters");
      return;
    }

    if (watchlist.some(s => s.symbol === symbol)) {
      setError("Symbol already in watchlist");
      return;
    }

    // Auto-detect sector based on symbol if it's a known one
    let sector = "Other";
    for (const [cat, symbols] of Object.entries(POPULAR_SYMBOLS)) {
      if (symbols.includes(symbol)) {
        // Map category to sector
        if (cat === "Mega Cap" || cat === "Tech") sector = "Technology";
        else if (cat === "Finance") sector = "Finance";
        else if (cat === "Healthcare") sector = "Healthcare";
        else if (cat === "ETFs") sector = "ETF";
        else if (cat === "Crypto") sector = "Crypto";
        else if (cat === "Energy") sector = "Energy";
        else sector = "Other";
        break;
      }
    }

    const newWatchlistSymbol: WatchlistSymbol = {
      symbol,
      name: newName.trim() || symbol,
      sector,
      isActive: true,
      addedAt: new Date().toISOString(),
    };

    onWatchlistChange([...watchlist, newWatchlistSymbol]);
    setNewSymbol("");
    setNewName("");
    setError("");
    toast.success(`${symbol} added to watchlist`);
  };

  const handleRemoveSymbol = (symbol: string) => {
    onWatchlistChange(watchlist.filter(s => s.symbol !== symbol));
    toast.success(`${symbol} removed from watchlist`);
  };

  const handleToggleActive = (symbol: string) => {
    const symbolData = watchlist.find(s => s.symbol === symbol);
    const newState = !symbolData?.isActive;
    
    onWatchlistChange(
      watchlist.map(s => 
        s.symbol === symbol ? { ...s, isActive: newState } : s
      )
    );
    
    toast.success(`${symbol} ${newState ? 'activated' : 'deactivated'}`);
  };

  const handleQuickAdd = (symbol: string) => {
    if (watchlist.some(s => s.symbol === symbol)) {
      return;
    }

    // Auto-detect sector for quick add
    let sector = "Other";
    for (const [cat, symbols] of Object.entries(POPULAR_SYMBOLS)) {
      if (symbols.includes(symbol)) {
        if (cat === "Mega Cap" || cat === "Tech") sector = "Technology";
        else if (cat === "Finance") sector = "Finance";
        else if (cat === "Healthcare") sector = "Healthcare";
        else if (cat === "ETFs") sector = "ETF";
        else if (cat === "Crypto") sector = "Crypto";
        else if (cat === "Energy") sector = "Energy";
        else sector = "Other";
        break;
      }
    }

    const newWatchlistSymbol: WatchlistSymbol = {
      symbol,
      name: symbol,
      sector,
      isActive: true,
      addedAt: new Date().toISOString(),
    };

    onWatchlistChange([...watchlist, newWatchlistSymbol]);
    toast.success(`${symbol} added to watchlist`);
  };

  const handleActivateAll = () => {
    onWatchlistChange(watchlist.map(s => ({ ...s, isActive: true })));
    toast.success(`All ${watchlist.length} symbols activated`);
  };

  const handleDeactivateAll = () => {
    onWatchlistChange(watchlist.map(s => ({ ...s, isActive: false })));
    toast.success(`All ${watchlist.length} symbols deactivated`);
  };

  const handleClearInactive = () => {
    const inactiveCount = watchlist.filter(s => !s.isActive).length;
    if (inactiveCount === 0) {
      toast.info("No inactive symbols to remove");
      return;
    }
    setShowClearConfirm(true);
  };

  const confirmClearInactive = () => {
    const inactiveCount = watchlist.filter(s => !s.isActive).length;
    onWatchlistChange(watchlist.filter(s => s.isActive));
    toast.success(`Removed ${inactiveCount} inactive symbols`);
    setShowClearConfirm(false);
  };

  const filteredWatchlist = watchlist.filter(s => 
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.sector && s.sector.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedWatchlist = sortWatchlist(filteredWatchlist, sortBy);

  const activeCount = watchlist.filter(s => s.isActive).length;
  const totalCount = watchlist.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col sm:max-w-[95vw] md:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Watchlist Manager
          </DialogTitle>
          <DialogDescription>
            Add or remove symbols to monitor. Only active symbols will be scanned for setups.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Stats Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Symbols</p>
                <p className="text-xl">{activeCount}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Total Symbols</p>
                <p className="text-xl">{totalCount}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy("symbol")}
                className={sortBy === "symbol" ? "bg-primary/10" : ""}
              >
                A-Z
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy("sector")}
                className={sortBy === "sector" ? "bg-primary/10" : ""}
              >
                Sector
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy("recent")}
                className={sortBy === "recent" ? "bg-primary/10" : ""}
              >
                Recent
              </Button>
            </div>
          </div>

          {/* Add New Symbol Form */}
          <div className="p-4 rounded-lg border border-border/50 bg-card/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm">Add New Symbol</h3>
              <Badge variant="outline" className="text-[10px]">
                Auto-detects sector
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                ref={symbolInputRef}
                placeholder="Symbol (e.g., AAPL)"
                value={newSymbol}
                onChange={(e) => {
                  setNewSymbol(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                className="uppercase"
              />
              <Input
                placeholder="Name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
              />
              <Button onClick={handleAddSymbol} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}
          </div>

          {/* Tabs: Watchlist & Quick Add */}
          <Tabs defaultValue="watchlist" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="watchlist">
                My Watchlist ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="quickadd">
                Quick Add
              </TabsTrigger>
            </TabsList>

            {/* Current Watchlist Tab */}
            <TabsContent value="watchlist" className="flex-1 overflow-hidden flex flex-col mt-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Bulk Actions */}
              {watchlist.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 pb-3 border-b border-border/30">
                  <span className="text-xs text-muted-foreground sm:mr-2">Bulk Actions:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleActivateAll}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Activate All</span>
                      <span className="sm:hidden">All On</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeactivateAll}
                      className="h-7 text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Deactivate All</span>
                      <span className="sm:hidden">All Off</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearInactive}
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear Inactive
                    </Button>
                  </div>
                </div>
              )}

              {/* Symbol List */}
              <ScrollArea className="flex-1 pr-4">
                {sortedWatchlist.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="mb-1">
                      {searchQuery ? "No symbols found" : "No symbols in watchlist"}
                    </p>
                    {!searchQuery && watchlist.length === 0 && (
                      <p className="text-xs mt-2">
                        Add symbols manually or use Quick Add tab
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedWatchlist.map((symbol) => (
                      <div
                        key={symbol.symbol}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-card/20 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono">{symbol.symbol}</span>
                            {!symbol.isActive && (
                              <EyeOff className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">
                              {symbol.name}
                            </p>
                          </div>
                          {symbol.sector && (
                            <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:flex">
                              {symbol.sector}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-end gap-2">
                          {symbol.sector && (
                            <Badge variant="outline" className="text-[10px] sm:hidden">
                              {symbol.sector}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleToggleActive(symbol.symbol)}
                            title={symbol.isActive ? "Deactivate" : "Activate"}
                          >
                            {symbol.isActive ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 shrink-0"
                            onClick={() => handleRemoveSymbol(symbol.symbol)}
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Quick Add Tab */}
            <TabsContent value="quickadd" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {Object.entries(POPULAR_SYMBOLS).map(([category, symbols]) => (
                    <div key={category}>
                      <h4 className="text-sm mb-2 text-muted-foreground">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {symbols.map((symbol) => {
                          const alreadyAdded = watchlist.some(s => s.symbol === symbol);
                          return (
                            <Button
                              key={symbol}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAdd(symbol)}
                              disabled={alreadyAdded}
                              className={`${alreadyAdded ? 'opacity-50' : ''}`}
                            >
                              {alreadyAdded && <Check className="w-3 h-3 mr-1" />}
                              {symbol}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeCount} active symbols will be monitored
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>
      </DialogContent>

      {/* Confirmation Dialog for Clear Inactive */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Inactive Symbols?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {watchlist.filter(s => !s.isActive).length} inactive symbols from your watchlist. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearInactive} className="bg-red-600 hover:bg-red-700">
              Clear Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
