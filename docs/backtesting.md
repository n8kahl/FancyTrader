# Backtesting API

The backend exposes `/api/backtest/run` to fetch Polygon aggregates, simulate strategies, and return summary metrics. Use this reference when wiring new tooling or troubleshooting results.

## Request payload

```jsonc
POST /api/backtest/run
{
  "symbol": "SPY",            // required ticker
  "from": "2024-01-01",       // ISO8601 start date/time
  "to": "2024-01-31",         // ISO8601 end date/time
  "timespan": "minute",       // "minute" | "hour" | "day"
  "limit": 5000,               // optional: cap Polygon rows
  "config": {                  // optional detector config blob
    "atrMultiplier": 1.5
  }
}
```

### Response

```jsonc
{
  "summary": {
    "winRate": 0.62,
    "totalR": 18.4,
    "maxDrawdownR": -4.7,
    "expectancyR": 0.42,
    "trades": 53,
    "symbol": "SPY"
  },
  "trades": [
    {
      "id": "SPY-2024-01-05T143000Z",
      "symbol": "SPY",
      "entryTime": "2024-01-05T14:30:00Z",
      "exitTime": "2024-01-05T15:05:00Z",
      "entryPrice": 485.13,
      "exitPrice": 487.02,
      "resultR": 1.7
    }
  ],
  "buckets": [
    {
      "weekStart": "2024-01-01",
      "count": 12,
      "winRate": 0.58,
      "totalR": 3.2
    }
  ]
}
```

### Metrics cheat sheet

| Field          | Definition |
|----------------|------------|
| `winRate`      | `wins / trades` (decimal 0–1).|
| `totalR`       | Sum of per-trade R multiples.|
| `maxDrawdownR` | Lowest equity delta measured from prior peak (in R).|
| `expectancyR`  | `winRate * avgWinR - (1 - winRate) * avgLossR`.|
| `buckets`      | Weekly rollups keyed by Monday UTC (`weekStart`).|

### Sample curl

```bash
curl -sS http://localhost:8080/api/backtest/run \
  -H "content-type: application/json" \
  -d '{
    "symbol": "SPY",
    "from": "2024-01-01",
    "to": "2024-01-31",
    "timespan": "minute",
    "limit": 5000
  }'
```

CSV exports will live at `/api/backtest/csv` (same query params); hook into `/api/share/discord/backtest` with the `summary` block above to broadcast results.
