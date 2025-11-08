import { Express } from "express";
import { PolygonClient } from "../services/polygonClient";
import { asyncHandler } from "../utils/asyncHandler";
import {
  optionChainQuerySchema,
  optionContractsQuerySchema,
  symbolWithOptionParamSchema,
  underlyingParamSchema,
} from "../validation/schemas";

const polygonClient = new PolygonClient();

export function setupOptionsRoutes(app: Express): void {
  /**
   * GET /api/options/contracts/:underlying - Get options contracts
   */
  app.get(
    "/api/options/contracts/:underlying",
    asyncHandler(async (req, res) => {
      const { underlying } = underlyingParamSchema.parse(req.params);
      const query = optionContractsQuerySchema.parse(req.query);
      const normalizedSymbol = underlying.toUpperCase();

      const contracts = await polygonClient.getOptionsContracts(
        normalizedSymbol,
        query.expiration,
        query.type,
        query.strike
      );

      res.json({
        underlying: normalizedSymbol,
        contracts,
        count: contracts.length,
      });
    })
  );

  /**
   * GET /api/options/snapshot/:underlying/:optionSymbol - Get options snapshot
   */
  app.get(
    "/api/options/snapshot/:underlying/:optionSymbol",
    asyncHandler(async (req, res) => {
      const { underlying, optionSymbol } = symbolWithOptionParamSchema.parse(req.params);
      const snapshot = await polygonClient.getOptionsSnapshot(
        underlying.toUpperCase(),
        optionSymbol.toUpperCase()
      );

      res.json({
        underlying: underlying.toUpperCase(),
        optionSymbol: optionSymbol.toUpperCase(),
        data: snapshot,
      });
    })
  );

  /**
   * GET /api/options/chain/:underlying - Get full options chain
   */
  app.get(
    "/api/options/chain/:underlying",
    asyncHandler(async (req, res) => {
      const { underlying } = underlyingParamSchema.parse(req.params);
      const { expiration } = optionChainQuerySchema.parse(req.query);
      const normalizedSymbol = underlying.toUpperCase();

      const [calls, puts] = await Promise.all([
        polygonClient.getOptionsContracts(normalizedSymbol, expiration, "call"),
        polygonClient.getOptionsContracts(normalizedSymbol, expiration, "put"),
      ]);

      res.json({
        underlying: normalizedSymbol,
        expiration,
        calls,
        puts,
        totalContracts: calls.length + puts.length,
      });
    })
  );
}
