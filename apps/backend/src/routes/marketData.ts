import pino from "pino";
import { Express } from "express";
import { MassiveClient, marketToMode } from "@fancytrader/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { symbolParamSchema } from "../validation/schemas.js";

const massive = new MassiveClient({
  apiKey: process.env.MASSIVE_API_KEY ?? "",
  baseUrl: process.env.MASSIVE_BASE_URL,
});
const log = pino({ name: "market-status" });

type MarketSession = "premarket" | "regular" | "aftermarket" | "closed";

function normalizeMarketSession(raw: any) {
  const session = marketToMode(raw);
  const toTs = (value: any) => (typeof value === "number" ? value : (value && Date.parse(value)) || null);
  return {
    session,
    nextOpen: toTs(raw?.next_open ?? raw?.calendar?.next_open),
    nextClose: toTs(raw?.next_close ?? raw?.calendar?.next_close),
    source: "massive" as const,
    raw,
  };
}

const fallbackStatus = () => ({
  session: "premarket" as MarketSession,
  nextOpen: null,
  nextClose: null,
  source: "fallback",
  raw: null,
});

export function setupMarketDataRoutes(app: Express): void {
  app.get(
    "/api/market/snapshot/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const snapshot = await massive.getIndexSnapshots([normalizedSymbol]);
        res.json({ symbol: normalizedSymbol, data: snapshot });
      } catch (error) {
        res
          .status(503)
          .json({ error: "Massive error", detail: (error as Error).message ?? String(error) });
      }
    })
  );

  app.get(
    "/api/market/previous-close/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const aggs = (await massive.getMinuteAggs(normalizedSymbol, 390)) as any;
        const results = Array.isArray(aggs?.results) ? aggs.results : [];
        if (!results.length) {
          res.status(404).json({ error: "Previous close data not found" });
          return;
        }
        res.json({ symbol: normalizedSymbol, data: results[results.length - 1] });
      } catch (error) {
        res
          .status(503)
          .json({ error: "Massive error", detail: (error as Error).message ?? String(error) });
      }
    })
  );

  app.get(
    "/api/market/status",
    asyncHandler(async (_req, res) => {
      try {
        const status = await massive.getMarketStatus();
        res.json(normalizeMarketSession(status));
      } catch (error: any) {
        log.warn(
          {
            code: error?.response?.status,
            url: error?.config?.url,
            data: error?.response?.data,
          },
          "Massive status failed; serving fallback"
        );
        return res.status(200).json(fallbackStatus());
      }
    })
  );
}
