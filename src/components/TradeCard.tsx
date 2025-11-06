import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Send, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  BarChart3
} from "lucide-react";
import { type OptionsContract, type PositionTracking, type TradeAlert, type TradeState } from "../types/options";
import { type ConfluenceFactor, calculateConfluenceScore, getStrengthColor, formatConfluenceValue } from "../types/confluence";
import { type Candle } from "./CandlestickChart";
import { EntryProgressIndicator } from "./EntryProgressIndicator";
import { getStrategyById } from "../config/strategies";

export type TradeStatus = 
  // Pre-Load States (Fluid - Always Updating)
  | "MONITORING"        // Stock being watched, no clear setup yet
  | "SETUP_FORMING"     // Strategy identified, conditions building
  | "SETUP_READY"       // All conditions met, ready to load
  // Post-Load States (Locked - Following Plan)
  | "ACTIVE"            // Contract loaded, position open
  | "PARTIAL_EXIT"      // Some contracts closed
  | "CLOSED"            // All contracts exited
  | "DISMISSED"         // Admin dismissed
  // Re-Entry
  | "REENTRY_SETUP";    // Looking for re-entry
export type Conviction = "HIGH" | "MEDIUM" | "LOW";
export type DayType = "TREND" | "CHOP" | "UNKNOWN";

export interface PatientCandle {
  isContained: boolean;
  // Patient Candle OHLC
  pcHigh: number;
  pcLow: number;
  pcOpen: number;
  pcClose: number;
  // Prior Candle OHLC (for containment check)
  priorHigh: number;
  priorLow: number;
  priorOpen: number;
  priorClose: number;
  // Trade direction
  direction: "LONG" | "SHORT";
}

export interface NoTradeWarnings {
  sma200Headwind?: boolean;
  chopDay?: boolean;
  preVWAPTime?: boolean;
  poorRiskReward?: boolean;
  pcInvalid?: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  setup: string; // Strategy name (can be any from strategy library)
  price: number;
  change: number;
  changePercent: number;
  // Fields that form progressively
  conviction?: Conviction; // Available when SETUP_FORMING+
  entry?: number; // Available when SETUP_FORMING+
  target?: number; // Available when SETUP_FORMING+
  stop?: number; // Available when SETUP_FORMING+
  riskReward?: string; // Available when SETUP_FORMING+
  status: TradeStatus;
  confluenceFactors: ConfluenceFactor[]; // Strategy-specific confluence
  timeframe?: "60m" | "5m" | "2m" | "10m" | "15m" | "1h" | "4h"; // Available when SETUP_FORMING+
  dayType?: DayType;
  patientCandle?: PatientCandle;
  priceData?: Candle[]; // Candlestick data for chart
  warnings?: NoTradeWarnings;
  marketPhase?: "PRE_MARKET" | "ORB_FORMING" | "POST_10" | "CLOUD_WINDOW" | "CLOSE";
  event?: "FOMC" | "CPI" | "EARNINGS" | null;
  // Options Trading
  tradeState: TradeState;
  optionsContract?: OptionsContract;
  position?: PositionTracking;
  alertHistory: TradeAlert[];
}

interface TradeCardProps {
  trade: Trade;
  onViewDetails: (trade: Trade) => void;
  onSendAlert: (trade: Trade) => void;
  onLoadContract?: (trade: Trade) => void;
  onManageTrade?: (trade: Trade) => void;
}

export function TradeCard({ trade, onViewDetails, onSendAlert, onLoadContract, onManageTrade }: TradeCardProps) {
  const isPositive = trade.change >= 0;
  
  // Check if options are enabled for this trade
  const hasOptions = trade.tradeState !== "SETUP" && trade.optionsContract;
  // Always show Load Contract button for admins to manually load if they see something
  const showLoadContract = onLoadContract;
  
  // Calculate entry progress (how close current price is to entry)
  const calculateEntryProgress = () => {
    if (!trade.entry || !trade.target || !trade.stop) return 0;
    const range = Math.abs(trade.entry - trade.price);
    const maxRange = Math.abs(trade.target - trade.stop);
    const progress = 100 - (range / maxRange) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const entryProgress = calculateEntryProgress();

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
        requiredConfluence: strategy.requiredConfluence?.join(", ") || "None specified",
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

  // Get active confluence factors (with safety check)
  const activeConfluence = trade.confluenceFactors ? trade.confluenceFactors.filter(f => f.present) : [];
  const confluenceScore = trade.confluenceFactors ? calculateConfluenceScore(trade.confluenceFactors) : 0;
  const hasWarnings = trade.warnings && Object.values(trade.warnings).some(v => v === true);
  const warningCount = trade.warnings ? Object.values(trade.warnings).filter(v => v === true).length : 0;

  // Status colors and indicators
  const getStatusColor = () => {
    switch (trade.status) {
      // Pre-Load States (Fluid)
      case "MONITORING": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "SETUP_FORMING": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "SETUP_READY": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      // Post-Load States (Locked)
      case "ACTIVE": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "PARTIAL_EXIT": return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
      case "CLOSED": return "text-gray-500 bg-gray-500/10 border-gray-500/20";
      case "DISMISSED": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "REENTRY_SETUP": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  // Check if trade is in fluid (pre-load) state
  const isFluidState = ["MONITORING", "SETUP_FORMING", "SETUP_READY", "REENTRY_SETUP"].includes(trade.status);
  
  // Check if trade is locked (post-load) state
  const isLockedState = ["ACTIVE", "PARTIAL_EXIT", "CLOSED"].includes(trade.status);

  // Conviction colors
  const getConvictionColor = () => {
    switch (trade.conviction) {
      case "HIGH": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "MEDIUM": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "LOW": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <Card className={`
      p-4 sm:p-5 hover:shadow-lg transition-all border-border/50 backdrop-blur
      ${isFluidState ? 'bg-card/30 animate-pulse-subtle' : ''}
      ${isLockedState ? 'bg-card/80 border-l-4 border-l-green-500/50' : ''}
      ${trade.status === 'SETUP_READY' ? 'ring-2 ring-blue-500/30' : ''}
    `}>
      {/* Status Indicator for Fluid States */}
      {isFluidState && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${trade.status === "MONITORING" ? "bg-gray-400 animate-pulse" : "bg-blue-500 animate-ping"}`} />
          <div className={`w-2 h-2 rounded-full ${trade.status === "MONITORING" ? "bg-gray-400" : "bg-blue-500"}`} />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl">{trade.symbol}</h3>
            {trade.event && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                {trade.event}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={getStatusColor()}>
              {trade.status.replace("_", " ")}
            </Badge>
            {trade.dayType && (
              <Badge 
                variant="outline" 
                className={
                  trade.dayType === "TREND" 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                }
              >
                {trade.dayType} DAY
              </Badge>
            )}
            {trade.timeframe && (
              <span className="text-xs text-muted-foreground">{trade.timeframe}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl">${trade.price.toFixed(2)}</p>
          <div className={`flex items-center gap-1 justify-end text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{trade.change.toFixed(2)} ({isPositive ? '+' : ''}{trade.changePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* MONITORING State - Minimal Info */}
      {trade.status === "MONITORING" && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />
            <span className="text-sm text-muted-foreground">Analyzing market conditions...</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Watching for strategy patterns and confluence opportunities
          </p>
          {activeConfluence.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-border/20">
              <span className="text-xs text-muted-foreground">Active factors:</span>
              {activeConfluence.slice(0, 4).map((factor) => (
                <Badge key={factor.factor} variant="outline" className={`text-xs ${getStrengthColor(factor.strength)}`}>
                  {factor.factor}
                </Badge>
              ))}
              {activeConfluence.length > 4 && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  +{activeConfluence.length - 4} more
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* SETUP_FORMING+ - Show Setup & Conviction */}
      {trade.setup && trade.conviction && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Setup</span>
            <Badge variant="outline" className={getConvictionColor()}>
              {trade.conviction} CONVICTION
            </Badge>
          </div>
          <p className="text-sm mb-2">{trade.setup}</p>
          {strategyInstructions && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/20">
              <p>{strategyInstructions.description}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                <span>• Timeframes: {strategyInstructions.timeframes}</span>
                <span>• Required: {strategyInstructions.requiredConfluence}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <p className="text-sm text-red-500">
                {warningCount} Warning{warningCount > 1 ? 's' : ''} Detected
              </p>
              <div className="space-y-0.5">
                {trade.warnings?.sma200Headwind && (
                  <p className="text-xs text-red-400">• 200 SMA headwind ahead</p>
                )}
                {trade.warnings?.chopDay && (
                  <p className="text-xs text-red-400">• ORB indicates chop day</p>
                )}
                {trade.warnings?.preVWAPTime && (
                  <p className="text-xs text-red-400">• VWAP setup before 10:00 ET</p>
                )}
                {trade.warnings?.poorRiskReward && (
                  <p className="text-xs text-red-400">• R:R below 1:2 minimum</p>
                )}
                {trade.warnings?.pcInvalid && (
                  <p className="text-xs text-red-400">• PC not contained</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Progress - Only show when setup is forming */}
      {trade.entry && trade.target && trade.stop && (
        <EntryProgressIndicator trade={trade} progress={entryProgress} />
      )}

      {/* Trade Levels - Only show when entry data exists */}
      {trade.entry && trade.target && trade.stop && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
            <p className="text-muted-foreground mb-1">Entry</p>
            <p className="text-green-500">${trade.entry.toFixed(2)}</p>
          </div>
          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
            <p className="text-muted-foreground mb-1">Target</p>
            <p className="text-blue-500">${trade.target.toFixed(2)}</p>
          </div>
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <p className="text-muted-foreground mb-1">Stop</p>
            <p className="text-red-500">${trade.stop.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Confluence & R:R - Only show when confluence exists */}
      {activeConfluence.length > 0 && (
        <div className="mb-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Confluence</span>
              <span className="text-sm">{confluenceScore}/10</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeConfluence.slice(0, 6).map((factor) => (
                <div 
                  key={factor.factor}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs"
                  style={{
                    backgroundColor: factor.strength === "HIGH" ? "rgba(16, 185, 129, 0.1)" :
                                   factor.strength === "MEDIUM" ? "rgba(245, 158, 11, 0.1)" :
                                   "rgba(107, 114, 128, 0.1)",
                    borderColor: factor.strength === "HIGH" ? "rgba(16, 185, 129, 0.2)" :
                               factor.strength === "MEDIUM" ? "rgba(245, 158, 11, 0.2)" :
                               "rgba(107, 114, 128, 0.2)",
                    color: factor.strength === "HIGH" ? "rgb(16, 185, 129)" :
                          factor.strength === "MEDIUM" ? "rgb(245, 158, 11)" :
                          "rgb(156, 163, 175)"
                  }}
                >
                  <span className="opacity-70">{factor.factor}:</span>
                  <span>{formatConfluenceValue(factor.value)}</span>
                </div>
              ))}
              {activeConfluence.length > 6 && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  +{activeConfluence.length - 6}
                </Badge>
              )}
            </div>
          </div>

          {trade.riskReward && (
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-sm text-muted-foreground">Risk:Reward</span>
              <span className="text-sm">{trade.riskReward}</span>
            </div>
          )}
        </div>
      )}

      {/* Patient Candle - Just show status in card */}
      {trade.patientCandle && (
        <div className="mb-4 p-2 rounded-lg bg-muted/20 border border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Patient Candle</span>
            {trade.patientCandle.isContained ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>Contained ✓</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <XCircle className="w-3 h-3" />
                <span>Invalid ✗</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Contract Info */}
      {hasOptions && trade.optionsContract && trade.position && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-muted-foreground">Options Contract</span>
            </div>
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {trade.tradeState.replace("_", " ")}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-mono">
                ${trade.optionsContract.strike}{trade.optionsContract.type === "CALL" ? "C" : "P"} {trade.optionsContract.expirationDisplay}
              </p>
              <p className="text-xs text-muted-foreground">{(trade.position.positionSize * 100).toFixed(0)}% position</p>
            </div>
            {trade.tradeState !== "LOADED" && (
              <div className="text-right">
                <p className={`text-lg ${trade.position.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.position.totalPL >= 0 ? '+' : ''}${Math.abs(trade.position.totalPL).toFixed(0)}
                </p>
                <p className={`text-xs ${trade.position.totalPLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.position.totalPLPercent >= 0 ? '+' : ''}{trade.position.totalPLPercent.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
          
          {trade.tradeState !== "LOADED" && (
            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/20">
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
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={() => onViewDetails(trade)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Details
        </Button>
        
        {hasOptions && onManageTrade ? (
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
            onClick={() => onManageTrade(trade)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Manage Trade
          </Button>
        ) : showLoadContract ? (
          <Button 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700" 
            onClick={() => onLoadContract!(trade)}
            disabled={trade.status === "DISMISSED"}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Load Contract
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
