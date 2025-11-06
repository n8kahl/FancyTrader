// Watchlist Configuration - Manage symbols being monitored

export interface WatchlistSymbol {
  symbol: string;
  name: string;
  sector?: string;
  isActive: boolean;
  addedAt?: string;
}

// Default watchlist - popular stocks and ETFs
export const DEFAULT_WATCHLIST: WatchlistSymbol[] = [
  // Mega Cap Tech
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", isActive: true },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology", isActive: true },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", isActive: true },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", isActive: true },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology", isActive: true },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", isActive: true },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", isActive: true },
  
  // Major ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "ETF", isActive: true },
  { symbol: "QQQ", name: "Invesco QQQ Trust", sector: "ETF", isActive: true },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", sector: "ETF", isActive: true },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", sector: "ETF", isActive: true },
  
  // Other Popular
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services", isActive: true },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", isActive: true },
  { symbol: "BABA", name: "Alibaba Group", sector: "Consumer Cyclical", isActive: true },
  { symbol: "BA", name: "Boeing Company", sector: "Industrials", isActive: true },
];

// Common sectors for categorization
export const SECTORS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Industrials",
  "Energy",
  "Materials",
  "Real Estate",
  "Communication Services",
  "Utilities",
  "Automotive",
  "ETF",
  "Crypto",
  "Other",
] as const;

export type Sector = typeof SECTORS[number];

// Popular symbols by category for quick add
export const POPULAR_SYMBOLS = {
  "Mega Cap": ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"],
  "Tech": ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "INTC", "CRM", "ORCL", "ADBE"],
  "Finance": ["JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW"],
  "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "TMO", "MRK", "ABT", "DHR"],
  "ETFs": ["SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "EEM", "GLD", "TLT"],
  "Crypto": ["COIN", "MSTR", "RIOT", "MARA", "SQ"],
  "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC"],
  "Meme/Retail": ["GME", "AMC", "BBBY", "PLTR", "SOFI"],
};

// Helper functions
export function getActiveSymbols(watchlist: WatchlistSymbol[]): string[] {
  return watchlist.filter(s => s.isActive).map(s => s.symbol);
}

export function isSymbolInWatchlist(symbol: string, watchlist: WatchlistSymbol[]): boolean {
  return watchlist.some(s => s.symbol.toUpperCase() === symbol.toUpperCase());
}

export function addSymbol(
  symbol: string, 
  name: string, 
  sector: string | undefined, 
  watchlist: WatchlistSymbol[]
): WatchlistSymbol[] {
  if (isSymbolInWatchlist(symbol, watchlist)) {
    return watchlist;
  }
  
  const newSymbol: WatchlistSymbol = {
    symbol: symbol.toUpperCase(),
    name,
    sector,
    isActive: true,
    addedAt: new Date().toISOString(),
  };
  
  return [...watchlist, newSymbol];
}

export function removeSymbol(symbol: string, watchlist: WatchlistSymbol[]): WatchlistSymbol[] {
  return watchlist.filter(s => s.symbol.toUpperCase() !== symbol.toUpperCase());
}

export function toggleSymbolActive(symbol: string, watchlist: WatchlistSymbol[]): WatchlistSymbol[] {
  return watchlist.map(s => 
    s.symbol.toUpperCase() === symbol.toUpperCase() 
      ? { ...s, isActive: !s.isActive }
      : s
  );
}

export function sortWatchlist(watchlist: WatchlistSymbol[], sortBy: "symbol" | "sector" | "recent"): WatchlistSymbol[] {
  const sorted = [...watchlist];
  
  switch (sortBy) {
    case "symbol":
      return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    case "sector":
      return sorted.sort((a, b) => (a.sector || "").localeCompare(b.sector || ""));
    case "recent":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.addedAt || 0).getTime();
        const dateB = new Date(b.addedAt || 0).getTime();
        return dateB - dateA;
      });
    default:
      return sorted;
  }
}
