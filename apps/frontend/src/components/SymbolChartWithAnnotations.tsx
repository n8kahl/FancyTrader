import { CandlestickChart, generateMockCandles, type Candle, type PatientCandleData } from "./CandlestickChart";
import { useAnnotations } from "../hooks/useAnnotations";
import { cn } from "./ui/utils";

interface SymbolChartWithAnnotationsProps {
  symbol: string;
  userId?: string | null;
  candles?: Candle[];
  currentPrice?: number;
  patientCandle?: PatientCandleData;
  keyLevels?: { price: number; label: string }[];
  height?: number;
  fallbackEntry?: number;
  fallbackStop?: number | null;
  fallbackTargets?: number[];
}

export function SymbolChartWithAnnotations({
  symbol,
  userId,
  candles,
  currentPrice,
  patientCandle,
  keyLevels,
  height = 320,
  fallbackEntry,
  fallbackStop,
  fallbackTargets,
}: SymbolChartWithAnnotationsProps) {
  const resolvedCandles = candles && candles.length > 0
    ? candles
    : generateMockCandles(currentPrice ?? 100, 60, 0.02, "sideways");
  const lastClose = resolvedCandles[resolvedCandles.length - 1]?.close ?? 0;
  const defaultEntry = fallbackEntry ?? lastClose;
  const defaultTargets = fallbackTargets ?? [];

  const { items, isLoading, error, add, update } = useAnnotations(symbol, userId);
  const active = items[0] ?? null;

  const handleAnnotationChange = async (patch: {
    entry?: number;
    stop?: number | null;
    targets?: number[];
  }) => {
    if (active) {
      await update(active.id, patch);
      return;
    }

    await add({
      entry: patch.entry ?? defaultEntry,
      stop: patch.stop ?? fallbackStop ?? null,
      targets: patch.targets ?? defaultTargets,
    });
  };

  const resolvedTargets = active?.targets?.length
    ? active.targets
    : defaultTargets;

  return (
    <div className="space-y-2">
      <CandlestickChart
        candles={resolvedCandles}
        entry={active?.entry ?? defaultEntry}
        targets={resolvedTargets}
        stop={active?.stop ?? fallbackStop ?? null}
        currentPrice={currentPrice}
        patientCandle={patientCandle}
        keyLevels={keyLevels}
        height={height}
        onAnnotationDragEnd={handleAnnotationChange}
      />
      {isLoading && (
        <p className="text-xs text-muted-foreground">Syncing annotations…</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {!active && !isLoading && (
        <button
          type="button"
          className={cn(
            "text-xs border rounded-md px-3 py-1 transition",
            "border-border/50 hover:border-border"
          )}
          onClick={() =>
            add({ entry: defaultEntry, stop: fallbackStop ?? null, targets: defaultTargets })
          }
        >
          Add annotation
        </button>
      )}
    </div>
  );
}
