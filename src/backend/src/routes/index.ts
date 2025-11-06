import { Express } from 'express';
import { setupSetupsRoutes } from './setups';
import { setupWatchlistRoutes } from './watchlist';
import { setupMarketDataRoutes } from './marketData';
import { setupOptionsRoutes } from './options';
import { SupabaseService } from '../services/supabaseService';
import { StrategyDetectorService } from '../services/strategyDetector';
import { PolygonStreamingService } from '../services/polygonStreamingService';

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

export function setupRoutes(app: Express, services: Services): void {
  // API routes
  setupSetupsRoutes(app, services);
  setupWatchlistRoutes(app, services);
  setupMarketDataRoutes(app, services);
  setupOptionsRoutes(app, services);
}
