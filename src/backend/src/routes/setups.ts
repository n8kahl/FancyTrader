import { Express, Request, Response } from 'express';
import { SupabaseService } from '../services/supabaseService';
import { StrategyDetectorService } from '../services/strategyDetector';
import { PolygonStreamingService } from '../services/polygonStreamingService';

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

export function setupSetupsRoutes(app: Express, services: Services): void {
  const { supabaseService, strategyDetector } = services;

  /**
   * GET /api/setups - Get all active setups
   */
  app.get('/api/setups', async (req: Request, res: Response) => {
    try {
      const setups = strategyDetector.getActiveSetups();
      res.json({ setups, count: setups.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/setups/:symbol - Get setups for a specific symbol
   */
  app.get('/api/setups/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const setups = strategyDetector.getSetupsForSymbol(symbol.toUpperCase());
      res.json({ symbol, setups, count: setups.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/setups/history/:userId - Get setup history from database
   */
  app.get('/api/setups/history/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const setups = await supabaseService.getSetups();
      res.json({ userId, setups, count: setups.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/setups/:setupId - Delete a setup
   */
  app.delete('/api/setups/:setupId', async (req: Request, res: Response) => {
    try {
      const { setupId } = req.params;
      await supabaseService.deleteSetup(setupId);
      res.json({ success: true, setupId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
