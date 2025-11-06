import { Express, Request, Response } from 'express';
import { SupabaseService } from '../services/supabaseService';
import { StrategyDetectorService } from '../services/strategyDetector';
import { PolygonStreamingService } from '../services/polygonStreamingService';
import { WatchlistSymbol } from '../types';

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

export function setupWatchlistRoutes(app: Express, services: Services): void {
  const { supabaseService } = services;

  /**
   * GET /api/watchlist/:userId - Get user's watchlist
   */
  app.get('/api/watchlist/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const watchlist = await supabaseService.getWatchlist(userId);
      res.json({ userId, watchlist, count: watchlist.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/watchlist/:userId - Save user's watchlist
   */
  app.post('/api/watchlist/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { watchlist } = req.body;

      if (!Array.isArray(watchlist)) {
        return res.status(400).json({ error: 'Watchlist must be an array' });
      }

      await supabaseService.saveWatchlist(userId, watchlist);
      res.json({ success: true, userId, count: watchlist.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/watchlist/:userId/add - Add symbols to watchlist
   */
  app.put('/api/watchlist/:userId/add', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { symbols } = req.body;

      if (!Array.isArray(symbols)) {
        return res.status(400).json({ error: 'Symbols must be an array' });
      }

      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const existingSymbols = new Set(currentWatchlist.map(w => w.symbol));

      const newSymbols: WatchlistSymbol[] = symbols
        .filter(s => !existingSymbols.has(s.symbol))
        .map(s => ({
          ...s,
          enabled: true,
          addedAt: Date.now()
        }));

      const updatedWatchlist = [...currentWatchlist, ...newSymbols];
      await supabaseService.saveWatchlist(userId, updatedWatchlist);

      res.json({ 
        success: true, 
        added: newSymbols.length,
        watchlist: updatedWatchlist 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/watchlist/:userId/remove/:symbol - Remove symbol from watchlist
   */
  app.delete('/api/watchlist/:userId/remove/:symbol', async (req: Request, res: Response) => {
    try {
      const { userId, symbol } = req.params;

      const currentWatchlist = await supabaseService.getWatchlist(userId);
      const updatedWatchlist = currentWatchlist.filter(w => w.symbol !== symbol.toUpperCase());

      await supabaseService.saveWatchlist(userId, updatedWatchlist);

      res.json({ 
        success: true, 
        removed: symbol,
        watchlist: updatedWatchlist 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
