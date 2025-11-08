import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { DiscordShareButton } from "./DiscordShareButton";
import type { BacktestSharePayload, BacktestShareSummary } from "../services/apiClient";

interface MetricProps {
  label: string;
  value: ReactNode;
}

const Metric = ({ label, value }: MetricProps) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase text-muted-foreground">{label}</span>
    <span className="text-lg font-semibold">{value}</span>
  </div>
);

interface BacktestResultsProps {
  summary: BacktestShareSummary;
  csvLink?: string;
  note?: string;
}

export function BacktestResults({ summary, csvLink, note }: BacktestResultsProps) {
  const payload: BacktestSharePayload = {
    summary,
    link: csvLink,
    note,
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Backtest Summary</CardTitle>
        <DiscordShareButton kind="backtest" payload={payload} />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Win rate" value={`${(summary.winRate * 100).toFixed(1)}%`} />
        <Metric label="Total R" value={summary.totalR.toFixed(2)} />
        <Metric label="Max Drawdown" value={summary.maxDrawdownR.toFixed(2)} />
        <Metric label="Expectancy" value={summary.expectancyR.toFixed(2)} />
        {summary.trades !== undefined && <Metric label="Trades" value={summary.trades} />}
      </CardContent>
      {csvLink && (
        <CardContent>
          <a href={csvLink} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
            Download CSV export
          </a>
        </CardContent>
      )}
    </Card>
  );
}
