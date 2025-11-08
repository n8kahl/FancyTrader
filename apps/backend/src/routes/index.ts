import { Express } from "express";
import { setupSetupsRoutes } from "./setups";
import { setupWatchlistRoutes } from "./watchlist";
import { setupMarketDataRoutes } from "./marketData";
import { setupOptionsRoutes } from "./options";
import { setupBacktestRoutes } from "./backtest";
import { setupAlertsRoutes } from "./alerts";
import { setupShareRoutes } from "./share";
import { setupTradesRoutes } from "./trades";
import { SupabaseService } from "../services/supabaseService";
import { StrategyDetectorService } from "../services/strategyDetector";
import { PolygonStreamingService } from "../services/polygonStreamingService";
import { AlertRegistry } from "../alerts/registry";

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
  alertRegistry: AlertRegistry;
}

export function setupRoutes(app: Express, services: Services): void {
  // API routes
  setupSetupsRoutes(app, services);
  setupWatchlistRoutes(app, services);
  setupMarketDataRoutes(app);
  setupOptionsRoutes(app);
  setupBacktestRoutes(app);
  setupAlertsRoutes(app, services.alertRegistry);
  setupShareRoutes(app);
  setupTradesRoutes(app, services);
}
