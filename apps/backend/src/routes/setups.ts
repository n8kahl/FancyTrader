import type { Request } from "express";
import { Express } from "express";
import type { SupabaseService } from "../services/supabaseService";
import type { StrategyDetectorService } from "../services/strategyDetector";
import type { PolygonStreamingService } from "../services/polygonStreamingService";
import { asyncHandler } from "../utils/asyncHandler";
import { strategyParamsSchema, type StrategyParams } from "@fancytrader/shared/cjs";
import { defaultStrategyParams } from "../config/strategy.defaults";
import { badRequest } from "../utils/httpError";
import {
  setupIdParamSchema,
  symbolParamSchema,
  userIdParamSchema,
} from "../validation/schemas";

interface Services {
  supabaseService: SupabaseService;
  strategyDetector: StrategyDetectorService;
  polygonService: PolygonStreamingService;
}

function extractStrategyParams(req: Request): StrategyParams | undefined {
  if (req.body?.strategyParams) {
    return strategyParamsSchema.parse(req.body.strategyParams);
  }

  const queryValue = req.query.strategyParams;
  if (typeof queryValue === "string" && queryValue.trim().length > 0) {
    try {
      return strategyParamsSchema.parse(JSON.parse(queryValue));
    } catch (error) {
      throw badRequest("Invalid strategyParams query payload", "INVALID_STRATEGY_PARAMS", error);
    }
  }

  return undefined;
}

export function setupSetupsRoutes(app: Express, services: Services): void {
  const { supabaseService, strategyDetector } = services;

  /**
   * GET /api/setups - Get all active setups
   */
  app.get(
    "/api/setups",
    asyncHandler(async (req, res) => {
      const params = extractStrategyParams(req);
      strategyDetector.updateParams(params ?? defaultStrategyParams);
      const setups = strategyDetector.getActiveSetups();
      res.json({ setups, count: setups.length, strategyParams: strategyDetector.getParams() });
    })
  );

  /**
   * GET /api/setups/:symbol - Get setups for a specific symbol
   */
  app.get(
    "/api/setups/:symbol",
    asyncHandler(async (req, res) => {
      const params = extractStrategyParams(req);
      strategyDetector.updateParams(params ?? defaultStrategyParams);
      const { symbol } = symbolParamSchema.parse(req.params);
      const uppercaseSymbol = symbol.toUpperCase();
      const setups = strategyDetector.getSetupsForSymbol(uppercaseSymbol);
      res.json({ symbol: uppercaseSymbol, setups, count: setups.length, strategyParams: strategyDetector.getParams() });
    })
  );

  /**
   * GET /api/setups/history/:userId - Get setup history from database
   */
  app.get(
    "/api/setups/history/:userId",
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const setups = await supabaseService.getSetups();
      res.json({ userId, setups, count: setups.length });
    })
  );

  /**
   * DELETE /api/setups/:setupId - Delete a setup
   */
  app.delete(
    "/api/setups/:setupId",
    asyncHandler(async (req, res) => {
      const { setupId } = setupIdParamSchema.parse(req.params);
      await supabaseService.deleteSetup(setupId);
      res.json({ success: true, setupId });
    })
  );
}
