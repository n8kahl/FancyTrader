import type { Express, Request } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  TradeCreate,
  TradeUpdate,
  listTrades,
  createTrade,
  getTrade,
  updateTrade,
  deleteTrade,
} from "../services/tradeService";
import { asyncHandler } from "../utils/asyncHandler";

const idParamSchema = z.object({ id: z.string().min(1) });
const missingUserResponse = { error: "Missing userId (x-user-id header or ?userId=)" };

function resolveOwner(req: Request): string | null {
  const header = req.header("x-user-id");
  if (header) return header;
  const queryId = req.query.userId;
  if (typeof queryId === "string" && queryId.trim()) {
    return queryId.trim();
  }
  return null;
}

export function setupTradesRoutes(app: Express): void {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const owner = resolveOwner(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }
      const trades = await listTrades(owner);
      res.json(trades);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const owner = resolveOwner(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }
      const parsed = TradeCreate.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors });
        return;
      }
      const created = await createTrade(owner, parsed.data);
      res.status(201).json(created);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const owner = resolveOwner(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }
      const { id } = idParamSchema.parse(req.params);
      const trade = await getTrade(owner, id);
      if (!trade) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(trade);
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const owner = resolveOwner(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }
      const { id } = idParamSchema.parse(req.params);
      const parsed = TradeUpdate.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors });
        return;
      }
      const updated = await updateTrade(owner, id, parsed.data);
      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(updated);
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const owner = resolveOwner(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }
      const { id } = idParamSchema.parse(req.params);
      const removed = await deleteTrade(owner, id);
      if (!removed) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ ok: true });
    })
  );

  app.use("/api/trades", router);
}
