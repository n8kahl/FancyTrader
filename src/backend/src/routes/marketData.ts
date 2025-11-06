import { Express, Request, Response } from 'express';
import { PolygonClient } from '../services/polygonClient';
import { SupabaseService } from '../services/supabaseService';
import { StrategyDetectorService } from '../services/strategyDetector';
import { PolygonStreamingService } from '../services/polygonStreamingService';

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

const polygonClient = new PolygonClient();

export function setupMarketDataRoutes(app: Express, services: Services): void {
  /**
   * GET /api/market/snapshot/:symbol - Get current market snapshot
   */
  app.get('/api/market/snapshot/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const snapshot = await polygonClient.getSnapshot(symbol.toUpperCase());
      res.json({ symbol, data: snapshot });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/market/bars/:symbol - Get historical bars
   */
  app.get('/api/market/bars/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { 
        multiplier = '1', 
        timespan = 'minute', 
        from, 
        to, 
        limit = '50' 
      } = req.query;

      if (!from || !to) {
        return res.status(400).json({ 
          error: 'from and to query parameters are required (format: YYYY-MM-DD)' 
        });
      }

      const bars = await polygonClient.getAggregates(
        symbol.toUpperCase(),
        parseInt(multiplier as string),
        timespan as any,
        from as string,
        to as string,
        parseInt(limit as string)
      );

      res.json({ 
        symbol, 
        bars, 
        count: bars.length,
        timeframe: `${multiplier}${timespan}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/market/previous-close/:symbol - Get previous day's close
   */
  app.get('/api/market/previous-close/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const previousClose = await polygonClient.getPreviousClose(symbol.toUpperCase());
      
      if (!previousClose) {
        return res.status(404).json({ error: 'Previous close data not found' });
      }

      res.json({ symbol, data: previousClose });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/market/status - Get market status
   */
  app.get('/api/market/status', async (req: Request, res: Response) => {
    try {
      const status = await polygonClient.getMarketStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
