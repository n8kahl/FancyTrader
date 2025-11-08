import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";
import type { Trade } from "@/types/trade";
import type { TradeLite } from "@fancytrader/shared";
import { EntryProgressIndicator } from "./EntryProgressIndicator";
import { getStrategyById } from "../config/strategies";

type TradeListEntry = Trade & TradeLite;

interface TradeListItemProps {
  trade: TradeListEntry;
  onViewDetails: (trade: TradeListEntry) => void;
  onLoadContract?: (trade: TradeListEntry) => void;
  onManageTrade?: (trade: TradeListEntry) => void;
  onSendAlert?: (trade: TradeListEntry) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string, expanded: boolean) => void;
}

export function TradeListItem({
  trade,
  onViewDetails,
  onLoadContract,
  onManageTrade,
  onSendAlert,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: TradeListItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const resolvedEntry = trade.entry ?? trade.entryPrice;
  const resolvedTarget = trade.target ?? trade.targets?.[0];
  const resolvedStop = trade.stop ?? trade.stopLoss;
  const entryPrice = resolvedEntry ?? 0;
  const targetPrice = resolvedTarget ?? 0;
  const stopPrice = resolvedStop ?? 0;
  const price = trade.price ?? trade.currentPrice ?? trade.entryPrice ?? 0;
  const change = trade.change ?? 0;
  const changePercent = trade.changePercent ?? 0;
  const riskReward = trade.riskReward ?? 'N/A';
  const confluenceDetails = trade.confluenceDetails ?? {};
  const warnings = trade.warnings ?? {};
  const conviction = trade.conviction ?? 'MEDIUM';
  const dayType = trade.dayType ?? "UNKNOWN";

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = (expanded: boolean) => {
    if (onToggleExpand) {
      onToggleExpand(trade.id, expanded);
    } else {
      setInternalExpanded(expanded);
    }
  };
  const isPositive = change >= 0;

  // Calculate entry progress
  const calculateEntryProgress = () => {
    if (resolvedEntry === undefined || resolvedTarget === undefined || resolvedStop === undefined) {
      return 0;
    }
    const range = Math.abs(resolvedEntry - price);
    const maxRange = Math.abs(resolvedTarget - resolvedStop) || 1;
    const progress = 100 - (range / maxRange) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const entryProgress = calculateEntryProgress();

  // Check if options are enabled for this trade
  const hasOptions = trade.tradeState !== "SETUP" && trade.optionsContract;
  // Always show Load Contract button for admins to manually load if they see something
  const showLoadContract = onLoadContract;

  // Get strategy definition for complete instructions
  const getStrategyInstructions = () => {
    if (!trade.setup) return null;
    // Try to match setup name to strategy
    const setupLower = trade.setup.toLowerCase();
    let strategyId = "";

    if (setupLower.includes("orb") && setupLower.includes("pc")) strategyId = "orb_pc";
    else if (setupLower.includes("ema") && setupLower.includes("8")) strategyId = "ema8_bounce";
    else if (setupLower.includes("vwap")) strategyId = "vwap_strategy";
    else if (setupLower.includes("king") || setupLower.includes("queen")) strategyId = "king_queen";
    else if (setupLower.includes("cloud")) strategyId = "cloud_strategy";
    else if (setupLower.includes("fib")) strategyId = "fib_pullback";

    const strategy = strategyId ? getStrategyById(strategyId) : null;

    if (strategy) {
      return {
        description: strategy.description,
        timeframes: strategy.timeframes.join(", "),
        requiredConfluence: strategy.requiredConfluence?.join(", ") || "None",
      };
    }

    // Fallback generic instructions
    return {
      description: "Custom setup - follow LTP methodology",
      timeframes: trade.timeframe,
      requiredConfluence: "As identified",
    };
  };

  const strategyInstructions = getStrategyInstructions();

  const getConfluenceItems = (): string[] => {
    const items: string[] = [];
    const c = confluenceDetails;
    if (Object.keys(c).length === 0) return items;

    if (c.orbLine) items.push("ORB");
    if (c.vwap) items.push("VWAP");
    if (c.ema8) items.push("8-EMA");
    if (c.ema21) items.push("21-EMA");
    if (c.openPrice) items.push("Open");
    if (c.hourlyLevel) items.push("Hourly");
    if (c.sma200) items.push("200");
    if (c.fibonacci) items.push(`Fib ${c.fibonacci}`);

    return items;
  };

  const confluenceItems = getConfluenceItems();
  const hasWarnings = Object.values(warnings).some((v) => v === true);

  // Status colors and indicators
  const getStatusColor = () => {
    switch (trade.status) {
      // Pre-Load States (Fluid)
      case "MONITORING":
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "SETUP_FORMING":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "SETUP_READY":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      // Post-Load States (Locked)
      case "ACTIVE":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "PARTIAL_EXIT":
        return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
      case "CLOSED":
        return "text-gray-500 bg-gray-500/10 border-gray-500/20";
      case "DISMISSED":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "REENTRY_SETUP":
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  // Check if trade is in fluid (pre-load) state
  const isFluidState = ["MONITORING", "SETUP_FORMING", "SETUP_READY", "REENTRY_SETUP"].includes(
    trade.status
  );

  // Check if trade is locked (post-load) state
  const isLockedState = ["ACTIVE", "PARTIAL_EXIT", "CLOSED"].includes(trade.status);

  // Show entry progress for setup states
  const showEntryProgress = ["SETUP_FORMING", "SETUP_READY"].includes(trade.status);

  const getConvictionColor = () => {
    switch (trade.conviction) {
      case "HIGH":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "LOW":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div
        className={`
        border border-border/50 rounded-lg backdrop-blur overflow-hidden transition-all relative
        ${isFluidState ? "bg-card/30 animate-pulse-subtle" : ""}
        ${isLockedState ? "bg-card/80 border-l-4 border-l-green-500/50" : ""}
        ${trade.status === "SETUP_READY" ? "ring-2 ring-blue-500/30" : ""}
        ${!isFluidState && !isLockedState ? "bg-card/50" : ""}
      `}
      >
        {/* Status Indicator for Fluid States */}
        {isFluidState && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            <div
              className={`w-2 h-2 rounded-full ${trade.status === "MONITORING" ? "bg-gray-400 animate-pulse" : "bg-blue-500 animate-ping"}`}
            />
            <div
              className={`w-2 h-2 rounded-full ${trade.status === "MONITORING" ? "bg-gray-400" : "bg-blue-500"}`}
            />
          </div>
        )}

        {/* Compact Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors active:scale-[0.99]">
            {/* Symbol & Price */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg">{trade.symbol}</h3>
                {trade.event && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20"
                  >
                    {trade.event}
                  </Badge>
                )}
                {hasWarnings && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
                  {trade.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getConvictionColor()}`}>
                  {conviction}
                </Badge>
                {dayType && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      dayType === "TREND"
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                    }`}
                  >
                    {dayType}
                  </Badge>
                )}
              </div>
            </div>

            {/* Price & Change */}
            <div className="text-right flex-shrink-0">
              <p className="text-xl">${price.toFixed(2)}</p>
              <div
                className={`flex items-center gap-1 justify-end text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Expand Icon */}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform" />
            )}
          </button>
        </CollapsibleTrigger>

        {/* Entry Progress - Show in collapsed state for setup states */}
        {showEntryProgress && !isExpanded && (
          <div className="px-3 pb-2">
            <EntryProgressIndicator trade={trade} progress={entryProgress} compact />
          </div>
        )}

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3 animate-in fade-in-50 slide-in-from-top-2 duration-200">
            {/* MONITORING State */}
            {trade.status === "MONITORING" && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />
                  <p className="text-xs text-muted-foreground">Analyzing market conditions...</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  Watching for strategy patterns and confluence
                </p>
                {confluenceItems.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-border/20">
                    <span className="text-[10px] text-muted-foreground">Active:</span>
                    {confluenceItems.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="text-[10px] h-4 px-1 bg-muted/50"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Setup - SETUP_FORMING+ */}
            {trade.setup && strategyInstructions && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Setup</p>
                <p className="text-sm mb-1">{trade.setup}</p>
                <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1.5 border-t border-border/20">
                  <p>{strategyInstructions.description}</p>
                  <p>• Timeframes: {strategyInstructions.timeframes}</p>
                  <p>• Required: {strategyInstructions.requiredConfluence}</p>
                </div>
              </div>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    {warnings.sma200Headwind && (
                      <p className="text-xs text-red-400">• 200 SMA headwind</p>
                    )}
                    {warnings.chopDay && <p className="text-xs text-red-400">• Chop day</p>}
                    {warnings.preVWAPTime && (
                      <p className="text-xs text-red-400">• Pre-10:00 VWAP</p>
                    )}
                    {warnings.poorRiskReward && (
                      <p className="text-xs text-red-400">• Poor R:R</p>
                    )}
                    {warnings.pcInvalid && (
                      <p className="text-xs text-red-400">• PC not contained</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Entry Progress - Only show when entry data exists */}
            {resolvedEntry !== undefined && resolvedTarget !== undefined && resolvedStop !== undefined && (
              <div className="text-xs">
                <EntryProgressIndicator trade={trade} progress={entryProgress} />
              </div>
            )}

            {/* Trade Levels - Compact - Only show when entry data exists */}
            {resolvedEntry !== undefined && resolvedTarget !== undefined && resolvedStop !== undefined && (
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <div className="p-1.5 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-muted-foreground text-[10px]">Entry</p>
                  <p className="text-green-500">${entryPrice.toFixed(2)}</p>
                </div>
                <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                  <p className="text-muted-foreground text-[10px]">Target</p>
                  <p className="text-blue-500">${targetPrice.toFixed(2)}</p>
                </div>
                <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-muted-foreground text-[10px]">Stop</p>
                  <p className="text-red-500">${stopPrice.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Confluence - Only show when confluence data exists */}
            {Object.keys(confluenceDetails).length > 0 && trade.confluenceScore !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Confluence</span>
                  <span className="text-xs">{trade.confluenceScore}/10</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {confluenceItems.map((item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* R:R and PC - Only show when risk/reward data exists */}
            {riskReward && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground mb-0.5">R:R</p>
                  <p>{riskReward}</p>
                </div>
                {trade.patientCandle && (
                  <div className="p-2 rounded bg-muted/20">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-muted-foreground">PC</p>
                      {trade.patientCandle.isContained ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <p className="text-[10px]">
                      {trade.patientCandle.isContained ? "Contained ✓" : "Invalid ✗"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Options Contract Info */}
            {hasOptions && trade.optionsContract && trade.position && (
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-muted-foreground">Options</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  >
                    {trade.tradeState.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-mono">
                    ${trade.optionsContract.strike}
                    {trade.optionsContract.type === "CALL" ? "C" : "P"}{" "}
                    {trade.optionsContract.expirationDisplay}
                  </p>
                  {trade.tradeState !== "LOADED" && (
                    <p
                      className={`text-xs ${trade.position.totalPL >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {trade.position.totalPL >= 0 ? "+" : ""}$
                      {Math.abs(trade.position.totalPL).toFixed(0)}
                    </p>
                  )}
                </div>

                {trade.tradeState !== "LOADED" && (
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1.5 border-t border-border/20">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Entry</p>
                      <p>${trade.position.entryPremium.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Current</p>
                      <p>${trade.position.currentPremium.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Position</p>
                      <p>{(trade.position.positionSize * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(trade);
                }}
              >
                <Eye className="w-3 h-3 mr-1.5" />
                Details
              </Button>

              {showLoadContract ? (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadContract(trade);
                  }}
                  disabled={trade.status === "INVALID"}
                >
                  <DollarSign className="w-3 h-3 mr-1.5" />
                  Load Contract
                </Button>
              ) : hasOptions && onManageTrade ? (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageTrade(trade);
                  }}
                >
                  <BarChart3 className="w-3 h-3 mr-1.5" />
                  Manage
                </Button>
              ) : onSendAlert ? (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendAlert(trade);
                  }}
                  disabled={trade.status === "INVALID"}
                >
                  <Send className="w-3 h-3 mr-1.5" />
                  Alert
                </Button>
              ) : null}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
