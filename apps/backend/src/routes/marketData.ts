import { Express } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { symbolParamSchema } from "../validation/schemas.js";
import pino from "pino";
import {
  computeNextTimes,
  getMarketStatusNow,
  getUpcomingCalendar,
  normalizeSession,
} from "../services/massiveStatus.js";

const log = pino({ name: "market-status" });

export function setupMarketDataRoutes(app: Express): void {
  app.get(
    "/api/market/snapshot/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const snapshot = await getMarketStatusNow();
        res.json({ symbol: normalizedSymbol, data: snapshot });
      } catch (error) {
        res.status(503).json({
          error: "Massive error",
          detail: (error as Error).message ?? String(error),
        });
      }
    })
  );

  app.get(
    "/api/market/previous-close/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = symbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      try {
        const snapshot = await getMarketStatusNow();
        res.json({ symbol: normalizedSymbol, data: snapshot });
      } catch (error) {
        res.status(503).json({
          error: "Massive error",
          detail: (error as Error).message ?? String(error),
        });
      }
    })
  );

  app.get(
    "/api/market/status",
    asyncHandler(async (_req, res) => {
      try {
        const raw = await getMarketStatusNow();
        const session = normalizeSession(raw?.market);
        const isOpen = session === "open";
        const isPremarket = session === "early_trading";
        const isAfterHours = session === "late_trading";
        let nextOpen: string | null = null;
        let nextClose: string | null = null;
        try {
          const upcoming = await getUpcomingCalendar();
          const { nextOpen: no, nextClose: nc } = computeNextTimes(
            upcoming,
            raw?.serverTime ?? new Date().toISOString()
          );
          nextOpen = no;
          nextClose = nc;
        } catch {
          /* ignored */
        }
        const exchangeStates = raw?.exchanges ?? {};
        log.info(
          { market: raw?.market, session, nextOpen, nextClose },
          "Massive status fetched"
        );
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
      } catch (error: any) {
        const status = error?.response?.status ?? 502;
        log.warn({ status, url: error?.config?.url }, "Massive status failed");
        return res.status(status).json({
          source: "massive",
          error: error?.response?.data ?? { message: String(error?.message ?? error) },
        });
      }
    })
  );
}
