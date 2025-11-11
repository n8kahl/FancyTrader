import { Express } from "express";
import { PolygonClient } from "../services/massiveClient.js";
import { MassiveClient } from "@fancytrader/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  optionChainQuerySchema,
  optionContractsQuerySchema,
  symbolWithOptionParamSchema,
  underlyingParamSchema,
} from "../validation/schemas.js";

const polygonClient = new PolygonClient();
const massive = new MassiveClient();

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
      const snapshot = await massive.getOptionSnapshot(
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

  app.get(
    "/api/options/quote/:optionSymbol",
    asyncHandler(async (req, res) => {
      const { optionSymbol } = symbolWithOptionParamSchema.pick({ optionSymbol: true }).parse(req.params);
      const quote = await massive.getOptionQuote(optionSymbol.toUpperCase());
      res.json({ optionSymbol: optionSymbol.toUpperCase(), data: quote });
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
