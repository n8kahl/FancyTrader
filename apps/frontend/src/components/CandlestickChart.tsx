import { TrendingUp, TrendingDown } from "lucide-react";

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PatientCandleData {
  priorCandleIndex: number; // Index in the candles array
  pcCandleIndex: number; // Index in the candles array
  isContained: boolean;
  direction: "LONG" | "SHORT";
}

interface CandlestickChartProps {
  candles: Candle[];
  entry?: number;
  target?: number;
  stop?: number;
  currentPrice?: number;
  patientCandle?: PatientCandleData;
  keyLevels?: { price: number; label: string }[];
  height?: number;
}

export function CandlestickChart({
  candles,
  entry,
  target,
  stop,
  currentPrice,
  patientCandle,
  keyLevels = [],
  height = 300,
}: CandlestickChartProps) {
  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No price data available
      </div>
    );
  }

  // Calculate price range for scaling
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  if (entry) allPrices.push(entry);
  if (target) allPrices.push(target);
  if (stop) allPrices.push(stop);
  if (currentPrice) allPrices.push(currentPrice);
  keyLevels.forEach((level) => allPrices.push(level.price));

  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;

  // Convert price to Y coordinate (0-100)
  const priceToY = (price: number) => {
    return ((maxPrice + padding - price) / (priceRange + 2 * padding)) * 100;
  };

  // Calculate candle width and spacing
  const candleCount = candles.length;
  const chartWidth = 100; // SVG viewBox width
  const candleSpacing = chartWidth / (candleCount + 1);
  const candleWidth = candleSpacing * 0.6;

  return (
    <div className="relative">
      {/* Price axis labels */}
      <div className="absolute -left-16 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground">
        <span>${maxPrice.toFixed(2)}</span>
        <span>${((maxPrice + minPrice) / 2).toFixed(2)}</span>
        <span>${minPrice.toFixed(2)}</span>
      </div>

      {/* SVG Chart */}
      <svg
        className="w-full"
        style={{ height: `${height}px` }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Background grid */}
        <line
          x1="0"
          y1="25"
          x2="100"
          y2="25"
          stroke="currentColor"
          strokeWidth="0.1"
          className="text-border opacity-30"
          strokeDasharray="1,1"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeWidth="0.1"
          className="text-border opacity-30"
          strokeDasharray="1,1"
        />
        <line
          x1="0"
          y1="75"
          x2="100"
          y2="75"
          stroke="currentColor"
          strokeWidth="0.1"
          className="text-border opacity-30"
          strokeDasharray="1,1"
        />

        {/* Reference levels */}
        {target && (
          <g>
            <line
              x1="0"
              y1={priceToY(target)}
              x2="100"
              y2={priceToY(target)}
              stroke="#3b82f6"
              strokeWidth="0.3"
              strokeDasharray="2,1"
            />
            <text
              x="98"
              y={priceToY(target) - 0.5}
              fontSize="2.5"
              fill="#3b82f6"
              textAnchor="end"
              className="font-mono"
            >
              Target ${target.toFixed(2)}
            </text>
          </g>
        )}

        {entry && (
          <g>
            <line
              x1="0"
              y1={priceToY(entry)}
              x2="100"
              y2={priceToY(entry)}
              stroke="#10b981"
              strokeWidth="0.4"
              strokeDasharray="2,1"
            />
            <text
              x="98"
              y={priceToY(entry) - 0.5}
              fontSize="2.5"
              fill="#10b981"
              textAnchor="end"
              className="font-mono"
            >
              Entry ${entry.toFixed(2)}
            </text>
          </g>
        )}

        {stop && (
          <g>
            <line
              x1="0"
              y1={priceToY(stop)}
              x2="100"
              y2={priceToY(stop)}
              stroke="#ef4444"
              strokeWidth="0.3"
              strokeDasharray="2,1"
            />
            <text
              x="98"
              y={priceToY(stop) + 2.5}
              fontSize="2.5"
              fill="#ef4444"
              textAnchor="end"
              className="font-mono"
            >
              Stop ${stop.toFixed(2)}
            </text>
          </g>
        )}

        {/* Key Levels */}
        {keyLevels.map((level, idx) => (
          <g key={`level-${idx}`}>
            <line
              x1="0"
              y1={priceToY(level.price)}
              x2="100"
              y2={priceToY(level.price)}
              stroke="#a855f7"
              strokeWidth="0.4"
              strokeDasharray="3,2"
            />
            <text
              x="2"
              y={priceToY(level.price) - 0.5}
              fontSize="2.5"
              fill="#a855f7"
              textAnchor="start"
              className="font-mono"
            >
              {level.label}
            </text>
          </g>
        ))}

        {/* Current price indicator */}
        {currentPrice && (
          <g>
            <line
              x1="0"
              y1={priceToY(currentPrice)}
              x2="100"
              y2={priceToY(currentPrice)}
              stroke="#8b5cf6"
              strokeWidth="0.5"
            />
            <circle cx="98" cy={priceToY(currentPrice)} r="0.8" fill="#8b5cf6" />
          </g>
        )}

        {/* Candlesticks */}
        {candles.map((candle, index) => {
          const x = candleSpacing * (index + 1);
          const bodyTop = Math.max(candle.open, candle.close);
          const bodyBottom = Math.min(candle.open, candle.close);
          const isBullish = candle.close > candle.open;

          // Check if this is the Prior Candle or Patient Candle
          const isPriorCandle = index === patientCandle?.priorCandleIndex;
          const isPCCandle = index === patientCandle?.pcCandleIndex;

          let candleColor = isBullish ? "#22c55e" : "#ef4444";
          let opacity = 0.8;
          let strokeWidth = 0.3;

          // Highlight Patient Candle and Prior Candle
          if (isPriorCandle) {
            candleColor = "#6b7280";
            opacity = 0.5;
            strokeWidth = 0.4;
          } else if (isPCCandle) {
            // Gold color for patient candle
            candleColor = "#fbbf24";
            opacity = 1;
            strokeWidth = 0.8;
          }

          return (
            <g key={index}>
              {/* Wick */}
              <line
                x1={x}
                y1={priceToY(candle.high)}
                x2={x}
                y2={priceToY(candle.low)}
                stroke={candleColor}
                strokeWidth={strokeWidth * 0.5}
                opacity={opacity}
              />

              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={priceToY(bodyTop)}
                width={candleWidth}
                height={Math.max(0.2, priceToY(bodyBottom) - priceToY(bodyTop))}
                fill={candleColor}
                fillOpacity={opacity}
                stroke={candleColor}
                strokeWidth={strokeWidth}
              />

              {/* Patient Candle containment indicator */}
              {isPCCandle && patientCandle && !patientCandle.isContained && (
                <>
                  {candle.high > candles[patientCandle.priorCandleIndex].high && (
                    <circle cx={x} cy={priceToY(candle.high)} r="0.6" fill="#ef4444" />
                  )}
                  {candle.low < candles[patientCandle.priorCandleIndex].low && (
                    <circle cx={x} cy={priceToY(candle.low)} r="0.6" fill="#ef4444" />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Patient Candle annotation */}
        {patientCandle && (
          <g>
            {/* Prior Candle label */}
            <text
              x={candleSpacing * (patientCandle.priorCandleIndex + 1)}
              y="95"
              fontSize="2.5"
              fill="#6b7280"
              textAnchor="middle"
              className="font-mono"
            >
              Prior
            </text>

            {/* PC label */}
            <text
              x={candleSpacing * (patientCandle.pcCandleIndex + 1)}
              y="95"
              fontSize="2.5"
              fill="#fbbf24"
              textAnchor="middle"
              className="font-mono"
            >
              PC
            </text>

            {/* Direction arrow */}
            {patientCandle.direction === "LONG" ? (
              <g transform={`translate(${candleSpacing * (patientCandle.pcCandleIndex + 1)}, 3)`}>
                <TrendingUp className="w-3 h-3 text-amber-400" />
              </g>
            ) : (
              <g transform={`translate(${candleSpacing * (patientCandle.pcCandleIndex + 1)}, 3)`}>
                <TrendingDown className="w-3 h-3 text-amber-400" />
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Time axis */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
        <span>{candles[0]?.timestamp || ""}</span>
        <span>{candles[Math.floor(candles.length / 2)]?.timestamp || ""}</span>
        <span>{candles[candles.length - 1]?.timestamp || ""}</span>
      </div>

      {/* Legend */}
      {patientCandle && (
        <div className="mt-4 flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-500/50 border border-gray-500" />
            <span className="text-muted-foreground">Prior Candle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-amber-400 border border-amber-400" />
            <span className="text-muted-foreground">Patient Candle (PC)</span>
          </div>
          {keyLevels.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-purple-500" />
              <span className="text-muted-foreground">Key Levels</span>
            </div>
          )}
          {!patientCandle.isContained && (
            <div className="flex items-center gap-1.5 text-red-500">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Containment Breach</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to generate realistic mock candle data
export function generateMockCandles(
  basePrice: number,
  count = 30,
  volatility = 0.02,
  trend: "up" | "down" | "sideways" = "sideways"
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute candles
    const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // Add trend bias
    let trendBias = 0;
    if (trend === "up") trendBias = volatility * 0.3;
    if (trend === "down") trendBias = -volatility * 0.3;

    // Generate OHLC
    const open = currentPrice;
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice + trendBias * basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;

    candles.push({
      timestamp: timeStr,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });

    currentPrice = close;
  }

  return candles;
}
