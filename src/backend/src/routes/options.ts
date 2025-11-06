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

export function setupOptionsRoutes(app: Express, services: Services): void {
  /**
   * GET /api/options/contracts/:underlying - Get options contracts
   */
  app.get('/api/options/contracts/:underlying', async (req: Request, res: Response) => {
    try {
      const { underlying } = req.params;
      const { expiration, type, strike } = req.query;

      const contracts = await polygonClient.getOptionsContracts(
        underlying.toUpperCase(),
        expiration as string | undefined,
        type as 'call' | 'put' | undefined,
        strike ? parseFloat(strike as string) : undefined
      );

      res.json({ 
        underlying: underlying.toUpperCase(), 
        contracts, 
        count: contracts.length 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/options/snapshot/:underlying/:optionSymbol - Get options snapshot
   */
  app.get('/api/options/snapshot/:underlying/:optionSymbol', async (req: Request, res: Response) => {
    try {
      const { underlying, optionSymbol } = req.params;
      
      const snapshot = await polygonClient.getOptionsSnapshot(
        underlying.toUpperCase(),
        optionSymbol.toUpperCase()
      );

      res.json({ 
        underlying: underlying.toUpperCase(),
        optionSymbol: optionSymbol.toUpperCase(),
        data: snapshot 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/options/chain/:underlying - Get full options chain
   */
  app.get('/api/options/chain/:underlying', async (req: Request, res: Response) => {
    try {
      const { underlying } = req.params;
      const { expiration } = req.query;

      if (!expiration) {
        return res.status(400).json({ 
          error: 'expiration query parameter is required (format: YYYY-MM-DD)' 
        });
      }

      // Get both calls and puts
      const [calls, puts] = await Promise.all([
        polygonClient.getOptionsContracts(
          underlying.toUpperCase(),
          expiration as string,
          'call'
        ),
        polygonClient.getOptionsContracts(
          underlying.toUpperCase(),
          expiration as string,
          'put'
        )
      ]);

      res.json({
        underlying: underlying.toUpperCase(),
        expiration,
        calls,
        puts,
        totalContracts: calls.length + puts.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
