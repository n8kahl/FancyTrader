import { Express } from "express";
import { setupSetupsRoutes } from "./setups.js";
import { setupWatchlistRoutes } from "./watchlist.js";
import { setupMarketDataRoutes } from "./marketData.js";
import { setupOptionsRoutes } from "./options.js";
import { setupBacktestRoutes } from "./backtest.js";
import { setupAlertsRoutes } from "./alerts.js";
import { setupShareRoutes } from "./share.js";
import { setupTradesRoutes } from "./trades.js";
import { setupChartAnnotationsRoutes } from "./chartAnnotations.js";
import { SupabaseService } from "../services/supabaseService.js";
import { SupabaseSetupsService } from "../services/supabaseSetups.js";
import { StrategyDetectorService } from "../services/strategyDetector.js";
import { PolygonStreamingService } from "../services/polygonStreamingService.js";
import { AlertRegistry } from "../alerts/registry.js";

interface Services {
  supabaseService: SupabaseService;
  supabaseSetups: SupabaseSetupsService;
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
  setupTradesRoutes(app);
  setupChartAnnotationsRoutes(app);
}
