import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { symbolParamSchema } from "../validation/schemas.js";
import { z } from "zod";
import { serverEnv } from "@fancytrader/shared/env.server";
import { MassiveClient } from "@fancytrader/shared/client/massive";
import { PolygonClient } from "../services/massiveClient.js";

const qSchema = z.object({
  underlying: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.string().optional(),
});

function createMassive(): MassiveClient {
  if (!serverEnv.MASSIVE_API_KEY || !serverEnv.MASSIVE_REST_BASE) {
    throw new Error("Missing MASSIVE_API_KEY or MASSIVE_REST_BASE");
  }
  return new MassiveClient({
    baseUrl: serverEnv.MASSIVE_REST_BASE,
    apiKey: serverEnv.MASSIVE_API_KEY,
    timeoutMs: 10_000,
    maxRetries: 5,
  });
}

export const optionsRouter = Router();
const polygonClient = new PolygonClient();
const chainQuery = z.object({
  expiration: z.string().min(1),
});

optionsRouter.get("/contracts/:symbol", async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol || "").trim();
  const parsed = qSchema.safeParse({
    underlying: symbol,
    limit: req.query.limit,
    page: req.query.page,
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const massive = createMassive();
    const data = await massive.getOptionsChain(parsed.data);
    const contracts = Array.isArray((data as any)?.results) ? (data as any).results : [];
    res.json({
      underlying: symbol.toUpperCase(),
      count: contracts.length,
      contracts,
    });
  } catch (e: any) {
    console.error("snapshot route error", e);
    const status = e?.response?.status ?? 500;
    res.status(status).json({ error: e?.message ?? "options_chain_failed" });
  }
});

optionsRouter.get("/snapshot/:symbol/:contract", async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol || "").trim();
  const contract = String(req.params.contract || "").trim();
  if (!symbol || !contract) {
    return res.status(400).json({ error: "symbol and contract required" });
  }
  try {
    const massive = createMassive();
    const data = await massive.getOptionSnapshot(symbol, contract);
    const payload =
      data && typeof data === "object" && "results" in (data as Record<string, unknown>)
        ? (data as Record<string, unknown>).results
        : data;
    res.json({
      underlying: symbol.toUpperCase(),
      optionSymbol: contract.toUpperCase(),
      data: payload,
    });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    res.status(status).json({ error: e?.message ?? "option_snapshot_failed" });
  }
});

optionsRouter.get("/contracts", async (req: Request, res: Response) => {
  const parsed = qSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { underlying, limit, page } = parsed.data;
  try {
    const massive = createMassive();
    const data = await massive.getOptionsChain({ underlying, limit, page });
    res.json(data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    res.status(status).json({ error: e?.message ?? "options_chain_failed" });
  }
});

optionsRouter.get(
  "/chain/:symbol",
  asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = symbolParamSchema.parse(req.params);
    const { expiration } = chainQuery.parse(req.query);
    const normalized = symbol.toUpperCase();
    try {
      const [calls, puts] = await Promise.all([
        polygonClient.getOptionsContracts(normalized, expiration, "call"),
        polygonClient.getOptionsContracts(normalized, expiration, "put"),
      ]);
      res.json({
        underlying: normalized,
        expiration,
        totalContracts: calls.length + puts.length,
        calls,
        puts,
      });
    } catch (error: any) {
      const status = error?.response?.status ?? 503;
      res.status(status).json({ error: error?.message ?? "options_chain_failed" });
    }
  })
);

export default optionsRouter;
