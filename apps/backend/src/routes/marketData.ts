import { Express } from "express";
import { MassiveClient, marketToMode } from "@fancytrader/shared";
import { PolygonClient } from "../services/polygonClient.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { aggQuerySchema, symbolParamSchema, cursorContractsQuerySchema } from "../validation/schemas.js";
import { badRequest, internalError } from "../utils/httpError.js";

const polygonClient = new PolygonClient();
let _massive: MassiveClient | null = null;
function getMassive(): MassiveClient {
  if (_massive) return _massive;
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY not configured");
  _massive = new MassiveClient({
    apiKey: key,
    baseUrl: process.env.MASSIVE_BASE_URL,
  });
  return _massive;
}

function normalizeMarketSession(rawResponse: unknown) {
  const raw = typeof rawResponse === "object" && rawResponse !== null ? rawResponse : {};
  const asTimestamp = (value: unknown): number | null => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };
  const session = marketToMode(raw);
  const nextOpen =
    asTimestamp((raw as any)?.next_open) ??
    asTimestamp((raw as any)?.nextOpening) ??
    asTimestamp((raw as any)?.calendar?.next_open);
  const nextClose =
    asTimestamp((raw as any)?.next_close) ??
    asTimestamp((raw as any)?.nextClosing) ??
    asTimestamp((raw as any)?.calendar?.next_close);
  return {
    session,
    nextOpen,
    nextClose,
    source: "massive" as const,
    raw,
  };
}


export function setupMarketDataRoutes(app: Express): void {
  /**
   * GET /api/market/snapshot/:symbol - Get current market snapshot
   */
  app.get(
    "/api/market/snapshot/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const snapshot = await getMassive().getTickerSnapshot(normalizedSymbol);
        res.json({ symbol: normalizedSymbol, data: snapshot });
      } catch (error) {
        res
          .status(503)
          .json({ error: "Massive not configured", detail: (error as Error).message ?? String(error) });
      }
    })
  );

  /**
   * GET /api/market-data/options/contracts - Get options contracts with cursor pagination
   */
  app.get(
    "/api/market-data/options/contracts",
    asyncHandler(async (req, res) => {
      const { underlying, cursor } = cursorContractsQuerySchema.parse(req.query);
      const normalized = underlying.toUpperCase();

      try {
        const result = await polygonClient.listOptionsContractsPaged(normalized, cursor);
        res.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_CURSOR") {
          throw badRequest("Invalid cursor token", "INVALID_CURSOR");
        }
        throw internalError("Failed to fetch options contracts", "UPSTREAM_ERROR", {
          underlying: normalized,
        });
      }
    })
  );

  /**
   * GET /api/market/bars/:symbol - Get historical bars
   */
  app.get(
    "/api/market/bars/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const { multiplier, timespan, from, to, limit } = aggQuerySchema.parse(req.query);
      const normalizedSymbol = symbol.toUpperCase();
      const bars = await polygonClient.getAggregates(
        normalizedSymbol,
        multiplier,
        timespan,
        from,
        to,
        limit
      );
      res.json({
        symbol: normalizedSymbol,
        bars,
        count: bars.length,
        timeframe: `${multiplier}${timespan}`,
      });
    })
  );

  /**
   * GET /api/market/previous-close/:symbol - Get previous day's close
   */
  app.get(
    "/api/market/previous-close/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const aggs = (await getMassive().getMinuteAggs(normalizedSymbol, 390)) as any;
        const results = Array.isArray(aggs?.results) ? aggs.results : [];
        if (!results.length) {
          res.status(404).json({ error: "Previous close data not found" });
          return;
        }
        res.json({ symbol: normalizedSymbol, data: results[results.length - 1] });
      } catch (error) {
        res
          .status(503)
          .json({ error: "Massive not configured", detail: (error as Error).message ?? String(error) });
      }
    })
  );

  /**
   * GET /api/market/status - Get market status
   */
  app.get(
    "/api/market/status",
    asyncHandler(async (_req, res) => {
      try {
        const status = await getMassive().getMarketStatus();
        res.json(normalizeMarketSession(status));
      } catch (error) {
        res
          .status(503)
          .json({ error: "Massive not configured", detail: (error as Error).message ?? String(error) });
      }
    })
  );
}
