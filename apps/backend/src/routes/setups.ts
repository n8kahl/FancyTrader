import type { Request } from "express";
import { Express } from "express";
import type { SupabaseSetupsService } from "../services/supabaseSetups";
import type { StrategyDetectorService } from "../services/strategyDetector";
import { asyncHandler } from "../utils/asyncHandler";
import { writeLimiter } from "../middleware/rateLimit";
import { strategyParamsSchema, type StrategyParams } from "@fancytrader/shared/cjs";
import { defaultStrategyParams } from "../config/strategy.defaults";
import { badRequest } from "../utils/httpError";
import {
  setupIdParamSchema,
  symbolParamSchema,
  userIdParamSchema,
} from "../validation/schemas";

interface Services {
  supabaseSetups: SupabaseSetupsService;
  strategyDetector: StrategyDetectorService;
}

const resolveUserId = (req: Request): string | undefined => {
  const headerUserId = req.header("x-user-id");
  if (typeof headerUserId === "string" && headerUserId.trim().length > 0) {
    return headerUserId.trim();
  }

  const queryValue = req.query.userId;
  if (typeof queryValue === "string" && queryValue.trim().length > 0) {
    return queryValue.trim();
  }

  return undefined;
};

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

const clampLimit = (value: unknown, fallback = 100): number => {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 500);
};

export function setupSetupsRoutes(app: Express, services: Services): void {
  const { supabaseSetups, strategyDetector } = services;

  app.get(
    "/api/setups",
    asyncHandler(async (req, res) => {
      const params = extractStrategyParams(req);
      strategyDetector.updateParams(params ?? defaultStrategyParams);
      const setups = strategyDetector.getActiveSetups();
      res.json({ setups, count: setups.length, strategyParams: strategyDetector.getParams() });
    })
  );

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

  app.get(
    "/api/setups/history/:userId",
    asyncHandler(async (req, res) => {
      const { userId } = userIdParamSchema.parse(req.params);
      const limit = clampLimit(req.query.limit, 100);
      const setups = await supabaseSetups.listSetups(userId, limit);
      res.json({ userId, setups, count: setups.length });
    })
  );

  app.delete(
    "/api/setups/:setupId",
    writeLimiter,
    asyncHandler(async (req, res) => {
      const { setupId } = setupIdParamSchema.parse(req.params);
      const owner = resolveUserId(req);
      await supabaseSetups.deleteSetup(setupId, owner);
      res.json({ success: true, setupId });
    })
  );
}
