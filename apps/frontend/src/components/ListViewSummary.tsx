import { TrendingUp, AlertTriangle, Target, Activity } from "lucide-react";
import type { Trade } from "@/types/trade";

interface ListViewSummaryProps {
  trades: Trade[];
}

export function ListViewSummary({ trades }: ListViewSummaryProps) {
  const activeCount = trades.filter((t) => t.status === "ACTIVE").length;
  const highConvictionCount = trades.filter((t) => t.conviction === "HIGH").length;
  const warningsCount = trades.filter((t) => Object.values(t.warnings ?? {}).some((v) => v)).length;
  const totalConfluence = trades.reduce((sum, t) => sum + (t.confluenceScore ?? 0), 0);
  const avgConfluence = trades.length > 0 ? (totalConfluence / trades.length).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-green-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-sm">{activeCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">High Conv</p>
          <p className="text-sm">{highConvictionCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Conf</p>
          <p className="text-sm">{avgConfluence}/10</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Warnings</p>
          <p className="text-sm">{warningsCount}</p>
        </div>
      </div>
    </div>
  );
}
