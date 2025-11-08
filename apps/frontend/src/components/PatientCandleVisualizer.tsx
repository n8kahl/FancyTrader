import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "./ui/badge";
import { DIAGNOSTICS_ENABLED } from "@/flags";

interface PatientCandleVisualizerProps {
  // Patient Candle data
  pcHigh: number;
  pcLow: number;
  pcOpen: number;
  pcClose: number;

  // Prior Candle data (for containment check)
  priorHigh: number;
  priorLow: number;
  priorOpen: number;
  priorClose: number;

  // Trade direction
  direction: "LONG" | "SHORT";

  // Entry and Stop levels
  entry: number;
  stop: number;

  // Compact mode for list view
  compact?: boolean;
}

export function PatientCandleVisualizer({
  pcHigh,
  pcLow,
  pcOpen,
  pcClose,
  priorHigh,
  priorLow,
  priorOpen,
  priorClose,
  direction,
  entry,
  stop,
  compact = false,
}: PatientCandleVisualizerProps) {
  if (!DIAGNOSTICS_ENABLED) {
    return null;
  }

  // Check containment based on direction
  const isContained =
    direction === "LONG"
      ? pcHigh <= priorHigh && pcLow >= priorLow // For longs: PC must be inside prior candle
      : pcHigh <= priorHigh && pcLow >= priorLow; // For shorts: same rule

  // Calculate visual scale
  const allPrices = [pcHigh, pcLow, priorHigh, priorLow, entry, stop];
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const range = maxPrice - minPrice;
  const padding = range * 0.1; // 10% padding

  // Convert price to Y position (0-100%)
  const priceToY = (price: number) => {
    return ((maxPrice + padding - price) / (range + 2 * padding)) * 100;
  };

  // Calculate candle body positions
  const priorBodyTop = Math.max(priorOpen, priorClose);
  const priorBodyBottom = Math.min(priorOpen, priorClose);
  const priorIsBullish = priorClose > priorOpen;

  const pcBodyTop = Math.max(pcOpen, pcClose);
  const pcBodyBottom = Math.min(pcOpen, pcClose);

  return (
    <div className={`${compact ? "p-2" : "p-4"} rounded-lg bg-muted/20 border border-border/30`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${compact ? "text-[10px]" : ""} text-muted-foreground`}>
            Patient Candle Validation
          </span>
          {direction === "LONG" ? (
            <TrendingUp className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-green-500`} />
          ) : (
            <TrendingDown className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-red-500`} />
          )}
        </div>
        {isContained ? (
          <Badge
            variant="outline"
            className="text-xs bg-green-500/10 text-green-500 border-green-500/20"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Contained ✓
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Invalid ✗
          </Badge>
        )}
      </div>

      {/* Visual Candles */}
      <div className="flex items-center gap-4">
        {/* Legend */}
        <div className="flex flex-col gap-2 text-[10px] text-muted-foreground min-w-[70px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-muted-foreground/30" />
            <span>Prior</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-sm ${direction === "LONG" ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>PC</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex items-center gap-1">
            <div className={`w-3 h-px ${direction === "LONG" ? "bg-green-500" : "bg-red-500"}`} />
            <span>Trigger</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-px bg-red-400" />
            <span>Stop</span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 relative" style={{ height: compact ? "120px" : "160px" }}>
          {/* Y-axis price labels */}
          <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground">
            <span>${maxPrice.toFixed(2)}</span>
            <span>${((maxPrice + minPrice) / 2).toFixed(2)}</span>
            <span>${minPrice.toFixed(2)}</span>
          </div>

          {/* SVG Chart */}
          <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
            {/* Background grid */}
            <line
              x1="0"
              y1="25"
              x2="200"
              y2="25"
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-border"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="50"
              x2="200"
              y2="50"
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-border"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="75"
              x2="200"
              y2="75"
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-border"
              strokeDasharray="2,2"
            />

            {/* Entry Trigger Level - Shows where price needs to break */}
            {direction === "LONG" && (
              <>
                <line
                  x1="0"
                  y1={priceToY(pcHigh)}
                  x2="200"
                  y2={priceToY(pcHigh)}
                  stroke="#22c55e"
                  strokeWidth="1.2"
                  strokeDasharray="4,2"
                />
                <text x="195" y={priceToY(pcHigh) - 1} fontSize="3" fill="#22c55e" textAnchor="end">
                  Entry Trigger ↑
                </text>
              </>
            )}
            {direction === "SHORT" && (
              <>
                <line
                  x1="0"
                  y1={priceToY(pcLow)}
                  x2="200"
                  y2={priceToY(pcLow)}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4,2"
                />
                <text x="195" y={priceToY(pcLow) + 4} fontSize="3" fill="#ef4444" textAnchor="end">
                  Entry Trigger ↓
                </text>
              </>
            )}

            {/* Stop Level */}
            <line
              x1="0"
              y1={priceToY(stop)}
              x2="200"
              y2={priceToY(stop)}
              stroke="#f87171"
              strokeWidth="0.8"
              strokeDasharray="3,2"
            />
            <text x="195" y={priceToY(stop) + 4} fontSize="3" fill="#f87171" textAnchor="end">
              Stop
            </text>

            {/* Prior Candle (left side) */}
            <g opacity="0.5">
              {/* Wick */}
              <line
                x1="60"
                y1={priceToY(priorHigh)}
                x2="60"
                y2={priceToY(priorLow)}
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground"
              />
              {/* Body */}
              <rect
                x="50"
                y={priceToY(priorBodyTop)}
                width="20"
                height={Math.max(0.5, priceToY(priorBodyBottom) - priceToY(priorBodyTop))}
                fill={priorIsBullish ? "#22c55e" : "#ef4444"}
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-muted-foreground"
              />
            </g>

            {/* Patient Candle (right side) */}
            <g>
              {/* Wick */}
              <line
                x1="130"
                y1={priceToY(pcHigh)}
                x2="130"
                y2={priceToY(pcLow)}
                stroke={direction === "LONG" ? "#22c55e" : "#ef4444"}
                strokeWidth="1.5"
              />
              {/* Body */}
              <rect
                x="120"
                y={priceToY(pcBodyTop)}
                width="20"
                height={Math.max(0.5, priceToY(pcBodyBottom) - priceToY(pcBodyTop))}
                fill={direction === "LONG" ? "#22c55e" : "#ef4444"}
                fillOpacity="0.8"
                stroke={direction === "LONG" ? "#22c55e" : "#ef4444"}
                strokeWidth="1"
              />

              {/* Containment indicator - show breach if invalid */}
              {!isContained && (
                <>
                  {pcHigh > priorHigh && (
                    <circle cx="130" cy={priceToY(pcHigh)} r="2" fill="#ef4444" />
                  )}
                  {pcLow < priorLow && (
                    <circle cx="130" cy={priceToY(pcLow)} r="2" fill="#ef4444" />
                  )}
                </>
              )}
            </g>

            {/* Labels */}
            <text
              x="60"
              y="97"
              fontSize="4"
              fill="currentColor"
              className="text-muted-foreground"
              textAnchor="middle"
            >
              Prior
            </text>
            <text
              x="130"
              y="97"
              fontSize="4"
              fill={direction === "LONG" ? "#22c55e" : "#ef4444"}
              textAnchor="middle"
            >
              PC
            </text>
          </svg>
        </div>
      </div>

      {/* Containment Rule & Entry Trigger Explanation */}
      <div
        className={`mt-3 p-2 rounded text-[10px] ${
          isContained
            ? "bg-green-500/5 text-green-600 dark:text-green-400"
            : "bg-red-500/5 text-red-600 dark:text-red-400"
        }`}
      >
        {isContained ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5">
              <p>
                <span className="opacity-80">✓ Containment Rule Met:</span> PC is fully inside prior
                candle range
              </p>
              <p className="opacity-70">
                <span className="opacity-90">Entry Trigger:</span> Price breaks{" "}
                {direction === "LONG" ? "above" : "below"} PC{" "}
                {direction === "LONG" ? "high" : "low"} ($
                {direction === "LONG" ? pcHigh.toFixed(2) : pcLow.toFixed(2)})
              </p>
              <p className="opacity-70">
                <span className="opacity-90">Stop:</span> ${stop.toFixed(2)} (other side of PC at $
                {direction === "LONG" ? pcLow.toFixed(2) : pcHigh.toFixed(2)})
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="mb-1">
                <span className="opacity-80">✗ Invalid Setup:</span> PC wick breaches prior candle
              </p>
              <p className="opacity-70">
                {pcHigh > priorHigh &&
                  "PC high ($" +
                    pcHigh.toFixed(2) +
                    ") exceeds prior high ($" +
                    priorHigh.toFixed(2) +
                    ")"}
                {pcLow < priorLow &&
                  "PC low ($" +
                    pcLow.toFixed(2) +
                    ") below prior low ($" +
                    priorLow.toFixed(2) +
                    ")"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
