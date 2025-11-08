import { Express } from "express";
import type { SupabaseService } from "../services/supabaseService";
import type { StrategyDetectorService } from "../services/strategyDetector";
import type { PolygonStreamingService } from "../services/polygonStreamingService";
import { WatchlistSymbol } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import {
  userIdParamSchema,
  watchlistBodySchema,
  watchlistBulkSchema,
  watchlistSymbolParamSchema,
} from "../validation/schemas";
import type { WatchlistInput } from "../validation/schemas";

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

export function setupWatchlistRoutes(app: Express, services: Services): void {
  const { supabaseService } = services;

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
