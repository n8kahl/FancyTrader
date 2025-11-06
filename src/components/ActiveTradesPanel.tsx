import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { type Trade } from "./TradeCard";

interface ActiveTradesPanelProps {
  trades: Trade[];
  onViewDetails: (trade: Trade) => void;
  onManageTrade: (trade: Trade) => void;
  onSendAlert: (trade: Trade) => void;
}

export function ActiveTradesPanel({ trades, onViewDetails, onManageTrade, onSendAlert }: ActiveTradesPanelProps) {
  if (trades.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-50">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm">Active Positions ({trades.length})</span>
          </div>
        </div>

        {/* Active Trades */}
        <ScrollArea className="h-32">
          <div className="flex gap-3 p-3">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="flex-shrink-0 w-72 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors cursor-pointer"
                onClick={() => onManageTrade(trade)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{trade.symbol}</span>
                    <Badge 
                      variant={
                        trade.tradeState === "LOADED" ? "outline" :
                        trade.tradeState === "ENTERED" ? "default" :
                        "secondary"
                      }
                      className="text-[10px] h-5"
                    >
                      {trade.tradeState}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(trade);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Contract Info */}
                {trade.optionsContract && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono">
                        ${trade.optionsContract.strike}
                        {trade.optionsContract.type === "CALL" ? "C" : "P"}
                      </span>
                      <span className="text-muted-foreground">
                        {trade.optionsContract.expirationDisplay}
                      </span>
                    </div>
                  </div>
                )}

                {/* P&L Display */}
                {trade.position && trade.tradeState !== "LOADED" ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {trade.position.totalPL >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className={`text-sm ${
                        trade.position.totalPL >= 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        ${Math.abs(trade.position.totalPL).toFixed(0)}
                      </span>
                    </div>
                    <span className={`text-xs ${
                      trade.position.totalPLPercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {trade.position.totalPLPercent >= 0 ? "+" : ""}
                      {trade.position.totalPLPercent.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    <span>Loaded @ ${trade.optionsContract?.premium.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
