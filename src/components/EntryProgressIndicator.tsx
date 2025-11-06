import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Progress } from "./ui/progress";
import { cn } from "./ui/utils";
import type { Trade } from "./TradeCard";

interface EntryCriterion {
  id: string;
  label: string;
  isMet: boolean;
  isWarning?: boolean;
}

interface EntryProgressIndicatorProps {
  trade: Trade;
  progress: number;
  compact?: boolean;
}

export function EntryProgressIndicator({ trade, progress, compact = false }: EntryProgressIndicatorProps) {
  // Define entry criteria based on trade
  const criteria: EntryCriterion[] = [];

  // 1. Confluence Check
  const hasMinimalConfluence = trade.confluenceScore >= 6;
  criteria.push({
    id: "confluence",
    label: "Confluence met",
    isMet: hasMinimalConfluence,
  });

  // 2. Patient Candle Check (if required)
  if (trade.patientCandle) {
    criteria.push({
      id: "patient_candle",
      label: "Patient Candle validated",
      isMet: trade.patientCandle.isContained,
      isWarning: !trade.patientCandle.isContained,
    });
  }

  // 3. Risk:Reward Check
  const rrValue = trade.riskReward ? parseFloat(trade.riskReward.split(":")[1] || "0") : 0;
  const hasGoodRR = rrValue >= 2;
  criteria.push({
    id: "risk_reward",
    label: "Risk:Reward ≥ 1:2",
    isMet: hasGoodRR,
    isWarning: !hasGoodRR && trade.warnings?.poorRiskReward,
  });

  // 4. No Trade Warnings Check
  const hasWarnings = trade.warnings && Object.values(trade.warnings).some(v => v === true);
  criteria.push({
    id: "no_warnings",
    label: "No trade warnings",
    isMet: !hasWarnings,
    isWarning: hasWarnings,
  });

  // 5. Market Phase Check
  const hasCorrectPhase = trade.marketPhase && trade.marketPhase !== "PRE_MARKET";
  criteria.push({
    id: "market_phase",
    label: "Market phase valid",
    isMet: hasCorrectPhase || !trade.marketPhase,
  });

  // 6. Price Proximity Check
  const isPriceNearEntry = progress >= 50;
  criteria.push({
    id: "price_proximity",
    label: "Price approaching entry",
    isMet: isPriceNearEntry,
  });

  // Calculate overall completion
  const metCriteria = criteria.filter(c => c.isMet).length;
  const totalCriteria = criteria.length;
  const completionPercent = (metCriteria / totalCriteria) * 100;

  // Determine progress bar color based on completion
  const getProgressColor = () => {
    if (completionPercent >= 80) return "bg-green-500";
    if (completionPercent >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getProgressBgColor = () => {
    if (completionPercent >= 80) return "bg-green-500/20";
    if (completionPercent >= 50) return "bg-yellow-500/20";
    return "bg-orange-500/20";
  };

  // Compact mode - just show progress bar
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Entry Progress</span>
          <span className="text-xs">
            {metCriteria}/{totalCriteria}
          </span>
        </div>
        <div className={cn("h-1.5 w-full rounded-full overflow-hidden", getProgressBgColor())}>
          <div
            className={cn("h-full transition-all duration-500", getProgressColor())}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Full mode - show everything
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Entry Progress</span>
        <span className="text-sm">
          {metCriteria}/{totalCriteria} criteria met
        </span>
      </div>

      {/* Progress Bar with Color Coding */}
      <div className="relative mb-3">
        <div className={cn("h-2 w-full rounded-full overflow-hidden", getProgressBgColor())}>
          <div
            className={cn("h-full transition-all duration-500", getProgressColor())}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Milestone Markers */}
        <div className="absolute top-0 left-0 right-0 h-2 flex justify-between items-center pointer-events-none">
          {[0, 25, 50, 75, 100].map((milestone) => (
            <div
              key={milestone}
              className={cn(
                "w-1 h-3 rounded-full transition-colors",
                completionPercent >= milestone
                  ? "bg-white shadow-md"
                  : "bg-muted-foreground/30"
              )}
              style={{ marginLeft: milestone === 0 ? "0" : "-2px" }}
            />
          ))}
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="flex items-start gap-1.5"
          >
            {criterion.isMet ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : criterion.isWarning ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
            )}
            <span
              className={cn(
                "text-xs leading-tight",
                criterion.isMet
                  ? "text-green-600 dark:text-green-400"
                  : criterion.isWarning
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
