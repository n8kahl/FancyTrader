import { Express, Request, Router } from "express";
import type { SupabaseService } from "../services/supabaseService.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import type { StrategyDetectorService } from "../services/strategyDetector.js";
import type { PolygonStreamingService } from "../services/polygonStreamingService.js";
import { WatchlistSymbol } from "../types/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  userIdParamSchema,
  watchlistBodySchema,
  watchlistAddSchema,
  watchlistBulkSchema,
  watchlistSymbolParamSchema,
} from "../validation/schemas.js";
import type { WatchlistInput } from "../validation/schemas.js";

const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim();

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

const normalizeSymbol = (input: WatchlistInput | WatchlistSymbol): WatchlistSymbol => ({
  symbol: input.symbol.toUpperCase(),
  name: input.name,
  sector: input.sector,
  enabled: input.enabled ?? true,
  addedAt: input.addedAt ?? Date.now(),
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolveUserId = (req: Request): string | undefined => {
  const headerUserId = req.header("x-user-id");
  if (isNonEmptyString(headerUserId)) {
    return headerUserId.trim();
  }

  const queryValue = req.query.userId;
  if (isNonEmptyString(queryValue)) {
    return queryValue.trim();
  }

  if (Array.isArray(queryValue)) {
    const firstMatch = queryValue.find(isNonEmptyString);
    if (firstMatch) {
      return firstMatch.trim();
    }
  }

  if (isNonEmptyString(DEMO_USER_ID)) {
    return DEMO_USER_ID;
  }

  return undefined;
};

export function setupWatchlistRoutes(app: Express, services: Services): void {
  const { supabaseService } = services;
  const compatibilityRouter = Router();

  /**
   * GET /api/watchlist - Compatibility route that uses headers/query for userId
   */
  compatibilityRouter.get(
    "/",
    asyncHandler(async (req, res) => {
      const userId = resolveUserId(req);
      if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
      }

      const watchlist = await supabaseService.getWatchlist(userId);
      res.json(watchlist);
    })
  );

  /**
   * POST /api/watchlist - Compatibility route that accepts single symbol payloads
   */
  compatibilityRouter.post(
    "/",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const userId = resolveUserId(req);
      if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
      }

      const symbolInput = watchlistAddSchema.parse(req.body);
      const newEntry = normalizeSymbol(symbolInput);
      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const exists = currentWatchlist.some((symbol) => symbol.symbol === newEntry.symbol);

      if (!exists) {
        const updatedWatchlist = [...currentWatchlist, newEntry];
        await supabaseService.saveWatchlist(userId, updatedWatchlist);
        res.json({ ok: true, watchlist: updatedWatchlist });
        return;
      }

      res.json({ ok: true, watchlist: currentWatchlist });
    })
  );

  /**
   * DELETE /api/watchlist/:symbol - Compatibility route that uses headers/query for userId
   */
  compatibilityRouter.delete(
    "/:symbol",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const userId = resolveUserId(req);
      if (!userId) {
        res.status(400).json({ error: "Missing userId" });
        return;
      }

      const { symbol } = watchlistSymbolParamSchema.parse(req.params);
      const normalizedSymbol = symbol.toUpperCase();
      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const updatedWatchlist = currentWatchlist.filter((entry) => entry.symbol !== normalizedSymbol);

      await supabaseService.saveWatchlist(userId, updatedWatchlist);
      res.json({ ok: true, removed: normalizedSymbol, watchlist: updatedWatchlist });
    })
  );

  app.use("/api/watchlist", compatibilityRouter);

  /**
   * GET /api/watchlist/:userId - Get user's watchlist
   */
  app.get(
    "/api/watchlist/:userId",
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const watchlist = await supabaseService.getWatchlist(userId);
      res.json({ userId, watchlist, count: watchlist.length });
    })
  );

  /**
   * POST /api/watchlist/:userId - Save user's watchlist
   */
  app.post(
    "/api/watchlist/:userId",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const { watchlist } = watchlistBodySchema.parse(req.body);
      const entries = watchlist.map(normalizeSymbol);
      await supabaseService.saveWatchlist(userId, entries);
      res.json({ success: true, userId, count: entries.length });
    })
  );

  /**
   * PUT /api/watchlist/:userId/add - Add symbols to watchlist
   */
  app.put(
    "/api/watchlist/:userId/add",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const { symbols } = watchlistBulkSchema.parse(req.body);

      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const existingSymbols = new Set(currentWatchlist.map((w) => w.symbol));

      const newSymbols: WatchlistSymbol[] = symbols
        .filter((s) => !existingSymbols.has(s.symbol.toUpperCase()))
        .map(normalizeSymbol);

      const updatedWatchlist = [...currentWatchlist, ...newSymbols];
      await supabaseService.saveWatchlist(userId, updatedWatchlist);

      res.json({ success: true, added: newSymbols.length, watchlist: updatedWatchlist });
    })
  );

  /**
   * DELETE /api/watchlist/:userId/remove/:symbol - Remove symbol from watchlist
   */
  app.delete(
    "/api/watchlist/:userId/remove/:symbol",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const { symbol } = watchlistSymbolParamSchema.parse(req.params);
      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const updatedWatchlist = currentWatchlist.filter((w) => w.symbol !== symbol.toUpperCase());
      await supabaseService.saveWatchlist(userId, updatedWatchlist);
      res.json({ success: true, removed: symbol.toUpperCase(), watchlist: updatedWatchlist });
    })
  );
}
