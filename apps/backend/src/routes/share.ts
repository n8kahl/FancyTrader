import type { Express, NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { tradeSchema } from "@fancytrader/shared";
import { DiscordService } from "../services/discordService.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";

const tradeShareSchema = z.object({ trade: tradeSchema });

const alertTypeSchema = z.enum([
  "ENTRY",
  "TRIM_25",
  "TRIM_50",
  "ADD",
  "STOP_LOSS",
  "TARGET_HIT",
  "EXIT_ALL",
  "CUSTOM",
]);

const customAlertSchema = z.object({
  symbol: z.string().min(1),
  type: alertTypeSchema,
  content: z.string().min(1),
  channelOverride: z.string().min(1).optional(),
});

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

const isDiscordConfigured = (): boolean => {
  const enabled = (process.env.DISCORD_ENABLED ?? "true").toLowerCase() === "true";
  const webhookSet = Boolean(process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.trim());
  return enabled && webhookSet;
};

const guardDiscord = (res: Response): boolean => {
  if (isDiscordConfigured()) {
    return false;
  }
  res.status(409).json({
    error: {
      message: "Discord is disabled or webhook not configured",
      code: "DISCORD_DISABLED",
    },
  });
  return true;
};

export function setupShareRoutes(app: Express): void {
  const router = Router();
  const discord = new DiscordService();

  router.post(
    "/discord/trade",
    idempotencyMiddleware,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (guardDiscord(res)) {
          return;
        }
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
        if (guardDiscord(res)) {
          return;
        }
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

  router.post(
    "/discord/alert",
    idempotencyMiddleware,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (guardDiscord(res)) {
          return;
        }

        const parsed = customAlertSchema.parse(req.body);
        const key = req.header("x-idempotency-key") ?? undefined;
        const formatted = `**${parsed.symbol} — ${parsed.type.replace(/_/g, " ")}**\n\n${parsed.content}`;
        const result = await discord.sendPlainContent(formatted, {
          idempotencyKey: key,
          webhook: parsed.channelOverride,
        });
        res.json({ ok: true, id: result.id });
      } catch (error) {
        next(error);
      }
    }
  );

  app.use("/api/share", router);
}
