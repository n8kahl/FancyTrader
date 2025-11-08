import type { Express } from "express";
import { Router } from "express";
import { z } from "zod";
import type { StrategyParams } from "@fancytrader/shared/cjs";
import { strategyParamsSchema } from "@fancytrader/shared/cjs";
import { fetchAggregates, runDetectors, type BacktestConfig } from "../backtest/runner";
import { bucketByWeek, computePnL } from "../backtest/metrics";
import { PolygonClient } from "../services/polygonClient";
import { defaultStrategyParams } from "../config/strategy.defaults";

const runSchema = z.object({
  symbol: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  timespan: z.enum(["minute", "hour", "day"]),
  limit: z.number().int().positive().max(10_000).optional(),
  config: z.record(z.unknown()).optional(),
  strategyParams: strategyParamsSchema.optional(),
});

export function setupBacktestRoutes(app: Express): void {
  const router = Router();
  const polygonClient = new PolygonClient();

  router.post("/run", async (req, res, next) => {
    try {
      const parsed = runSchema.parse(req.body) as BacktestConfig;
      const strategyParams: StrategyParams = parsed.strategyParams ?? defaultStrategyParams;
      const bars = await fetchAggregates(parsed, polygonClient);
      const trades = runDetectors(bars, strategyParams);
      const summary = computePnL(trades);
      const buckets = bucketByWeek(trades);
      res.json({ summary, trades, buckets, strategyParams });
    } catch (error) {
      next(error);
    }
  });

  router.get("/csv", async (_req, res) => {
    res.status(501).json({ error: "Not implemented" });
  });

  app.use("/api/backtest", router);
}
