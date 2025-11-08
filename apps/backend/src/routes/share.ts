import type { Express, NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { tradeSchema } from "@fancytrader/shared/cjs";
import { DiscordService } from "../services/discordService";
import { idempotencyMiddleware } from "../middleware/idempotency";

const tradeShareSchema = z.object({ trade: tradeSchema });

const backtestSummarySchema = z.object({
  winRate: z.number(),
  totalR: z.number(),
  maxDrawdownR: z.number(),
  expectancyR: z.number(),
  trades: z.number().optional(),
  symbol: z.string().optional(),
  strategy: z.string().optional(),
});

const backtestShareSchema = z.object({
  summary: backtestSummarySchema,
  link: z.string().url().optional(),
  note: z.string().optional(),
});

export function setupShareRoutes(app: Express): void {
  const router = Router();
  const discord = new DiscordService();

  router.post(
    "/discord/trade",
    idempotencyMiddleware,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = tradeShareSchema.parse(req.body);
        const result = await discord.sendTradeShare(parsed.trade, {
          webhook: process.env.DISCORD_WEBHOOK_URL,
          idempotencyKey: req.header("x-idempotency-key") ?? undefined,
        });
        res.json({ ok: true, id: result.id });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/discord/backtest",
    idempotencyMiddleware,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = backtestShareSchema.parse(req.body);
        const result = await discord.sendBacktestShare(parsed.summary, {
          link: parsed.link,
          note: parsed.note,
          webhook: process.env.DISCORD_WEBHOOK_URL,
          idempotencyKey: req.header("x-idempotency-key") ?? undefined,
        });
        res.json({ ok: true, id: result.id });
      } catch (error) {
        next(error);
      }
    }
  );

  app.use("/api/share", router);
}
