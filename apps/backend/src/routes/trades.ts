import type { Express } from "express";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { SupabaseService } from "../services/supabaseService";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import {
  tradeCreateSchema,
  tradeDtoSchema,
  tradeIdParamSchema,
  tradeUpdateSchema,
} from "../validation/schemas";

interface Services {
  supabaseService: SupabaseService;
}

export function setupTradesRoutes(app: Express, services: Services): void {
  const router = Router();
  const { supabaseService } = services;

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const trades = await supabaseService.getTrades();
      res.json({ trades });
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = tradeIdParamSchema.parse(req.params);
      const trade = await supabaseService.getTradeById(id);
      if (!trade) {
        throw notFound("Trade not found");
      }
      res.json({ trade });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = tradeCreateSchema.parse(req.body);
      const id = payload.id ?? randomUUID();
      const trade = tradeDtoSchema.parse({ ...payload, id });
      const saved = await supabaseService.upsertTrade(trade);
      res.status(201).json({ ok: true, trade: saved });
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = tradeIdParamSchema.parse(req.params);
      const body = tradeUpdateSchema.parse({ ...req.body, id });
      const existing = await supabaseService.getTradeById(id);
      if (!existing) {
        throw notFound("Trade not found");
      }
      const updated = await supabaseService.upsertTrade(body);
      res.json({ ok: true, trade: updated });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = tradeIdParamSchema.parse(req.params);
      const removed = await supabaseService.deleteTrade(id);
      if (!removed) {
        throw notFound("Trade not found");
      }
      res.json({ ok: true });
    })
  );

  app.use("/api/trades", router);
}
