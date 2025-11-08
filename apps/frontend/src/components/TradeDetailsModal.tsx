import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { DiscordShareButton } from "./DiscordShareButton";
import {
  Send,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  History,
} from "lucide-react";
import type { Trade } from "@/types/trade";
import { type PatientCandleData, generateMockCandles } from "./CandlestickChart";
import { SymbolChartWithAnnotations } from "./SymbolChartWithAnnotations";
import { getContractDisplay } from "../types/options";
import { getStrategyById } from "../config/strategies";
import {
  calculateConfluenceScore,
  getStrengthColor,
  formatConfluenceValue,
} from "../types/confluence";
import { getUserId } from "../lib/user";

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onSendAlert: (trade: Trade) => void;
}

// Generate patient candle data for chart if available
const getPatientCandleData = (trade: Trade): PatientCandleData | undefined => {
  if (!trade.patientCandle || !trade.priceData || trade.priceData.length < 2) {
    return undefined;
  }

  // Find the PC and prior candle in the price data
  // For demo, assume last 2 candles are PC (last) and Prior (second to last)
  const priorIndex = trade.priceData.length - 2;
  const pcIndex = trade.priceData.length - 1;

  return {
    priorCandleIndex: priorIndex,
    pcCandleIndex: pcIndex,
    isContained: trade.patientCandle.isContained,
    direction: trade.patientCandle.direction,
  };
};

// Extract key levels from confluence factors
const extractKeyLevels = (trade: Trade): { price: number; label: string }[] => {
  const levels: { price: number; label: string }[] = [];

  if (!trade.confluenceFactors) return levels;

  trade.confluenceFactors.forEach((cf) => {
    // Add safety checks for factor and value
    if (!cf.factor || !cf.value) return;

    const factorLower = cf.factor.toLowerCase();
    const valueStr = typeof cf.value === "string" ? cf.value : cf.value.toString();

    // Check for price levels in factor names and values
    if (
      factorLower.includes("level") ||
      factorLower.includes("support") ||
      factorLower.includes("resistance")
    ) {
      // Try to extract price from value (e.g., "$451.50" or "451.50")
      const priceMatch = /\$?(\d+\.?\d*)/.exec(valueStr);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        if (!isNaN(price) && price > 0) {
          levels.push({
            price,
            label: `${cf.factor}: $${price.toFixed(2)}`,
          });
        }
      }
    }
  });

  return levels;
};

export function TradeDetailsModal({ trade, isOpen, onClose, onSendAlert }: TradeDetailsModalProps) {
  if (!trade) return null;

  const price = trade.price ?? trade.currentPrice ?? trade.entryPrice ?? 0;
  const change = trade.change ?? 0;
  const changePercent = trade.changePercent ?? 0;
  const resolvedEntry = trade.entry ?? trade.entryPrice;
  const resolvedTarget = trade.target ?? trade.targets?.[0];
  const resolvedStop = trade.stop ?? trade.stopLoss;
  const entryPrice = resolvedEntry ?? 0;
  const targetPrice = resolvedTarget ?? 0;
  const stopPrice = resolvedStop ?? 0;
    const conviction = trade.conviction ?? 'MEDIUM';
    const riskReward = trade.riskReward ?? 'N/A';

  const isPositive = change >= 0;
  const confluenceScore = trade.confluenceFactors
    ? calculateConfluenceScore(trade.confluenceFactors)
    : trade.confluenceScore ?? 0;
  const activeConfluence = trade.confluenceFactors
    ? trade.confluenceFactors.filter((f) => f.present)
    : [];

  // Generate price data if not available
  const priceData =
    trade.priceData ||
    generateMockCandles(entryPrice || price, 30, 0.015, isPositive ? "up" : "down");

  const patientCandleData = getPatientCandleData(trade);
  const keyLevels = extractKeyLevels(trade);

  // Get strategy definition for complete instructions
  const getStrategyInstructions = () => {
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
        requiredConfluence: strategy.requiredConfluence || [],
        minimumRR: strategy.validationRules?.minimumRR || 2,
      };
    }

    return null;
  };

  const strategyInstructions = getStrategyInstructions();
    const annotationsUserId = getUserId();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{trade.symbol}</span>
            {trade.event && (
              <Badge
                variant="outline"
                className="bg-purple-500/10 text-purple-500 border-purple-500/20"
              >
                {trade.event}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {trade.setup} setup with {conviction} conviction
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Price & Status Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl">${price.toFixed(2)}</p>
                <div
                  className={`flex items-center gap-2 text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {change.toFixed(2)} ({isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge
                  variant="outline"
                  className={
                    trade.status === "ACTIVE"
                      ? "text-green-500 bg-green-500/10 border-green-500/20"
                      : "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
                  }
                >
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
              </div>
            </div>

            {/* Warnings Section */}
            {trade.warnings && Object.values(trade.warnings).some((v) => v === true) && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="text-red-500">Trading Warnings</p>
                    <div className="space-y-1.5">
                      {trade.warnings.sma200Headwind && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-400">200 SMA Headwind</p>
                            <p className="text-xs text-red-400/70">
                              200 SMA is blocking the trade direction - skip for poor R:R
                            </p>
                          </div>
                        </div>
                      )}
                      {trade.warnings.chopDay && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-400">Chop Day Classification</p>
                            <p className="text-xs text-red-400/70">
                              ORB indicates consolidation - treat as study day
                            </p>
                          </div>
                        </div>
                      )}
                      {trade.warnings.preVWAPTime && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-400">VWAP Setup Before 10:00 ET</p>
                            <p className="text-xs text-red-400/70">
                              VWAP strategies activate after 10:00 ET
                            </p>
                          </div>
                        </div>
                      )}
                      {trade.warnings.poorRiskReward && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-400">Poor Risk:Reward</p>
                            <p className="text-xs text-red-400/70">
                              R:R below minimum 1:2 threshold - prefer 1:3+
                            </p>
                          </div>
                        </div>
                      )}
                      {trade.warnings.pcInvalid && (
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-400">Patient Candle Not Contained</p>
                            <p className="text-xs text-red-400/70">
                              PC wick breaches prior candle range - invalidates setup
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-sm text-muted-foreground mb-2">Setup Type</p>
                <p className="text-lg mb-2">{trade.setup}</p>
                {strategyInstructions && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/20 mt-2">
                    <p>{strategyInstructions.description}</p>
                    <p>• Timeframes: {strategyInstructions.timeframes}</p>
                    <p>
                      • Required confluence: {strategyInstructions.requiredConfluence.join(", ")}
                    </p>
                    <p>• Minimum R:R: 1:{strategyInstructions.minimumRR}</p>
                  </div>
                )}
                {!strategyInstructions && (
                  <p className="text-xs text-muted-foreground mt-2">{trade.timeframe} timeframe</p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-sm text-muted-foreground mb-2">Conviction Level</p>
                <Badge
                  variant="outline"
                  className={
                    conviction === "HIGH"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : conviction === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                  }
                >
                  {conviction}
                </Badge>
              </div>
            </div>

            {/* Price Chart with Patient Candle Integration */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground mb-4">
                Price Action & Setup Formation
                {trade.patientCandle && (
                  <span className="ml-2 text-xs">
                    {trade.patientCandle.isContained ? (
                      <span className="text-green-500">✓ Patient Candle Contained</span>
                    ) : (
                      <span className="text-red-500">✗ Patient Candle Invalid</span>
                    )}
                  </span>
                )}
              </p>
              <SymbolChartWithAnnotations
                symbol={trade.symbol}
                userId={annotationsUserId}
                candles={priceData}
                currentPrice={price}
                patientCandle={patientCandleData}
                keyLevels={keyLevels}
                height={320}
                fallbackEntry={resolvedEntry ?? price}
                fallbackStop={resolvedStop ?? null}
                fallbackTargets={trade.targets ?? (resolvedTarget ? [resolvedTarget] : undefined)}
              />
            </div>

            {/* Trade Levels Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground mb-1">Entry</p>
                <p className="text-xl text-green-500">${entryPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(price - entryPrice).toFixed(2)} pts away
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-muted-foreground mb-1">Target</p>
                <p className="text-xl text-blue-500">${targetPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(targetPrice - entryPrice).toFixed(2)} pts upside
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-muted-foreground mb-1">Stop Loss</p>
                <p className="text-xl text-red-500">${stopPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.abs(entryPrice - stopPrice).toFixed(2)} pts risk
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-sm text-muted-foreground mb-1">Risk:Reward Ratio</p>
              <p className="text-2xl text-indigo-400">{riskReward}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 1:2 required • Prefer 1:3+
              </p>
            </div>

            {/* Patient Candle Technical Details */}
            {trade.patientCandle && (
              <>
                <Separator />
                <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
                  <h3 className="text-lg mb-3">Patient Candle Technical Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-2">Prior Candle Range</p>
                      <div className="space-y-1">
                        <p>High: ${trade.patientCandle.priorHigh.toFixed(2)}</p>
                        <p>Low: ${trade.patientCandle.priorLow.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          Range: $
                          {(trade.patientCandle.priorHigh - trade.patientCandle.priorLow).toFixed(
                            2
                          )}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-2">Patient Candle Range</p>
                      <div className="space-y-1">
                        <p>High: ${trade.patientCandle.pcHigh.toFixed(2)}</p>
                        <p>Low: ${trade.patientCandle.pcLow.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          Range: $
                          {(trade.patientCandle.pcHigh - trade.patientCandle.pcLow).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-3 p-3 rounded-lg border ${
                      trade.patientCandle.isContained
                        ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {trade.patientCandle.isContained ? (
                      <div className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="mb-1">
                            ✓ Containment Rule Met: PC fully inside prior candle
                          </p>
                          <p className="opacity-70">
                            Entry Trigger: Break{" "}
                            {trade.patientCandle.direction === "LONG" ? "above" : "below"} $
                            {trade.patientCandle.direction === "LONG"
                              ? trade.patientCandle.pcHigh.toFixed(2)
                              : trade.patientCandle.pcLow.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                          ✗ Invalid Setup: PC wick breaches prior candle range - invalidates setup
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Options Contract Details */}
            {trade.optionsContract && trade.position && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg">Options Position</h3>
                    <Badge
                      variant="outline"
                      className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    >
                      {trade.tradeState.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Contract Info */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                      <p className="text-sm text-muted-foreground mb-2">Contract Details</p>
                      <p className="text-xl font-mono mb-1">
                        {getContractDisplay(trade.optionsContract)}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Strike</p>
                          <p>${trade.optionsContract.strike.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Delta</p>
                          <p>{trade.optionsContract.delta.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Break-even</p>
                          <p>${trade.optionsContract.breakEven.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p>{trade.optionsContract.expirationDisplay}</p>
                        </div>
                      </div>
                    </div>

                    {/* P&L Info */}
                    {trade.tradeState !== "LOADED" && (
                      <div className="p-4 rounded-lg border border-border/50 bg-card/30">
                        <p className="text-sm text-muted-foreground mb-2">Position P&L</p>
                        <p
                          className={`text-3xl mb-1 ${trade.position.totalPL >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {trade.position.totalPL >= 0 ? "+" : ""}$
                          {Math.abs(trade.position.totalPL).toFixed(0)}
                        </p>
                        <p
                          className={`text-sm mb-3 ${trade.position.totalPLPercent >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {trade.position.totalPLPercent >= 0 ? "+" : ""}
                          {trade.position.totalPLPercent.toFixed(1)}%
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/30 pt-3">
                          <div>
                            <p className="text-muted-foreground">Entry</p>
                            <p>${trade.position.entryPremium.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current</p>
                            <p>${trade.position.currentPremium.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Entry Premium</p>
                            <p>${trade.position.entryPremium.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Premium</p>
                            <p>${trade.position.currentPremium.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <p className="text-muted-foreground mb-1">Position Size</p>
                      <p className="text-lg">{(trade.position.positionSize * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <p className="text-muted-foreground mb-1">Unrealized P&L</p>
                      <p
                        className={`text-lg ${trade.position.unrealizedPL >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        ${Math.abs(trade.position.unrealizedPL).toFixed(0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <p className="text-muted-foreground mb-1">Realized P&L</p>
                      <p
                        className={`text-lg ${trade.position.realizedPL >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        ${trade.position.realizedPL.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Alert History */}
            {trade.alertHistory && trade.alertHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-5 h-5" />
                    <h3 className="text-lg">Alert History</h3>
                    <Badge variant="outline">{trade.alertHistory.length}</Badge>
                  </div>

                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {trade.alertHistory.map((alert, index) => (
                        <div
                          key={alert.id}
                          className="p-4 rounded-lg border border-border/50 bg-card/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {alert.type.replace("_", " ")}
                              </Badge>
                              {index === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20"
                                >
                                  Latest
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </div>
                          </div>

                          <p className="text-sm font-mono whitespace-pre-wrap mb-3 p-2 rounded bg-muted/30">
                            {alert.message}
                          </p>

                          {alert.profitLoss !== undefined && (
                            <div className="pt-2 border-t border-border/30 text-xs">
                              <p className="text-muted-foreground mb-0.5">P&L</p>
                              <p
                                className={
                                  alert.profitLoss >= 0 ? "text-green-500" : "text-red-500"
                                }
                              >
                                ${alert.profitLoss.toFixed(0)} (
                                {alert.profitLossPercent?.toFixed(1)}%)
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            {/* Confluence Breakdown */}
            <Separator />
            <div>
              <h3 className="text-lg mb-3">
                Confluence Analysis
                <span className="ml-2 text-indigo-400">({confluenceScore}/10)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trade.confluenceFactors && trade.confluenceFactors.length > 0 ? (
                  trade.confluenceFactors.map((factor) => (
                    <div
                      key={factor.factor}
                      className={`p-3 rounded-lg border ${
                        factor.present
                          ? factor.strength === "HIGH"
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : factor.strength === "MEDIUM"
                              ? "bg-amber-500/10 border-amber-500/20"
                              : "bg-gray-500/10 border-gray-500/20"
                          : "bg-muted/20 border-border/30 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {factor.present ? (
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              factor.strength === "HIGH"
                                ? "text-emerald-400"
                                : factor.strength === "MEDIUM"
                                  ? "text-amber-400"
                                  : "text-gray-400"
                            }`}
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <p className="text-xs text-muted-foreground">{factor.factor}</p>
                      </div>
                      <p
                        className={`text-sm mb-1 ${
                          factor.present
                            ? factor.strength === "HIGH"
                              ? "text-emerald-400"
                              : factor.strength === "MEDIUM"
                                ? "text-amber-400"
                                : "text-gray-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatConfluenceValue(factor.value)}
                      </p>
                      {factor.description && (
                        <p className="text-xs text-muted-foreground opacity-70 mt-1">
                          {factor.description}
                        </p>
                      )}
                      {factor.present && (
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStrengthColor(factor.strength)}`}
                          >
                            {factor.strength}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 text-muted-foreground">
                    <p>No confluence data available</p>
                  </div>
                )}
              </div>

              {activeConfluence.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-indigo-400 mb-1">
                        Active Confluence Factors ({activeConfluence.length}/
                        {trade.confluenceFactors?.length ?? 0})
                      </p>
                      <p className="text-muted-foreground">
                        {activeConfluence
                          .map((c) => `${c.factor}: ${formatConfluenceValue(c.value)}`)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <DiscordShareButton kind="trade" payload={trade} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
