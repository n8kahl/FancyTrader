import { Express } from "express";
import { PolygonClient } from "../services/polygonClient";
import { asyncHandler } from "../utils/asyncHandler";
import { aggQuerySchema, symbolParamSchema, cursorContractsQuerySchema } from "../validation/schemas";
import { badRequest, internalError } from "../utils/httpError";

const polygonClient = new PolygonClient();

export function setupMarketDataRoutes(app: Express): void {
  /**
   * GET /api/market/snapshot/:symbol - Get current market snapshot
   */
  app.get(
    "/api/market/snapshot/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      const snapshot = await polygonClient.getSnapshot(normalizedSymbol);
      res.json({ symbol: normalizedSymbol, data: snapshot });
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
      const previousClose = await polygonClient.getPreviousClose(normalizedSymbol);

      if (!previousClose) {
        res.status(404).json({ error: "Previous close data not found" });
        return;
      }

      res.json({ symbol: normalizedSymbol, data: previousClose });
    })
  );

  /**
   * GET /api/market/status - Get market status
   */
  app.get(
    "/api/market/status",
    asyncHandler(async (_req, res) => {
      const status = await polygonClient.getMarketStatus();
      res.json(status);
    })
  );
}
