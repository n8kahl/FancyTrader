import { Express } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { symbolParamSchema } from "../validation/schemas.js";
import pino from "pino";
import { z } from "zod";
import { PolygonClient } from "../services/massiveClient.js";
import { marketToMode, type MarketStatusInput } from "@fancytrader/shared/client/massive";

const log = pino({ name: "market-status" });
const polygonClient = new PolygonClient();

const barsQuerySchema = z.object({
  multiplier: z.coerce.number().int().min(1).default(1),
  timespan: z.enum(["minute", "hour", "day"]).default("minute"),
  from: z.string().nonempty(),
  to: z.string().nonempty(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

const optionsQuerySchema = z.object({
  underlying: z.string().min(1),
  cursor: z.string().optional(),
});

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function setupMarketDataRoutes(app: Express): void {
  app.get(
    "/api/market/snapshot/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = normalizeSymbol(symbol);
      const snapshot = await polygonClient.getSnapshot(normalizedSymbol);
      res.json({ symbol: normalizedSymbol, data: snapshot });
    })
  );

  app.get(
    "/api/market/bars/:symbol",
    asyncHandler(async (req, res) => {
      const params = barsQuerySchema.parse(req.query);
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = normalizeSymbol(symbol);
      const bars = await polygonClient.getAggregates(
        normalizedSymbol,
        params.multiplier,
        params.timespan,
        params.from,
        params.to,
        params.limit
      );
      res.json({
        count: bars.length,
        timeframe: `${params.multiplier}${params.timespan}`,
        bars,
      });
    })
  );

  app.get(
    "/api/market/previous-close/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = normalizeSymbol(symbol);
      const bar = await polygonClient.getPreviousClose(normalizedSymbol);
      if (!bar) {
        return res.status(404).json({ error: "Previous close data not found" });
      }
      res.status(200).json({ symbol: normalizedSymbol, data: bar });
    })
  );

  app.get(
    "/api/market/status",
    asyncHandler(async (_req, res) => {
      try {
    const raw = (await polygonClient.getMarketStatus()) as MarketStatusInput;
        const session = marketToMode(raw);
        const isOpen = session === "regular";
        const isPremarket = session === "premarket";
        const isAfterHours = session === "aftermarket";
        const exchangeStates = ((raw as any)?.exchanges) ?? {};
        const nextOpen = (raw as any)?.next_open ?? null;
        const nextClose = (raw as any)?.next_close ?? null;
        log.info({ market: (raw as any)?.market, session, nextOpen, nextClose }, "Massive status fetched");
        return res.status(200).json({
          source: "massive",
          session,
          isOpen,
          isPremarket,
          isAfterHours,
          nextOpen,
          nextClose,
          exchangeStates,
          raw,
        });
      } catch (error) {
        return res.status(503).json({
          error: "Massive error",
          detail: (error as Error).message ?? String(error),
        });
      }
    })
  );

  app.get(
    "/api/market-data/options/contracts",
    asyncHandler(async (req, res) => {
      const { underlying, cursor } = optionsQuerySchema.parse(req.query);
      const normalized = normalizeSymbol(underlying);
      try {
        const result = await polygonClient.listOptionsContractsPaged(normalized, cursor ?? undefined);
        res.status(200).json(result);
      } catch (error: any) {
        if (error?.message === "INVALID_CURSOR") {
          return res.status(400).json({ error: { code: "INVALID_CURSOR", message: error.message } });
        }
        log.error({ error }, "Failed to paginate options contracts");
        return res.status(503).json({ error: "options_unavailable" });
      }
    })
  );
}
