import { z } from "zod";
import { tradeStatusSchema } from "@fancytrader/shared/cjs";


export const symbolParamSchema = z.object({ symbol: z.string().min(1) });
export const symbolWithOptionParamSchema = z.object({
  underlying: z.string().min(1),
  optionSymbol: z.string().min(1),
});
export const underlyingParamSchema = z.object({ underlying: z.string().min(1) });
export const setupIdParamSchema = z.object({ setupId: z.string().min(1) });
export const userIdParamSchema = z.object({ userId: z.string().min(1) });
export const watchlistSymbolParamSchema = z.object({ symbol: z.string().min(1) });

export const aggQuerySchema = z.object({
  multiplier: z.coerce.number().int().positive().default(1),
  timespan: z.enum(["minute", "hour", "day"]).default("minute"),
  from: z.string().min(1),
  to: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50000).default(50),
});

export const optionContractsQuerySchema = z.object({
  expiration: z.string().optional(),
  type: z.enum(["call", "put"]).optional(),
  strike: z.coerce.number().optional(),
});

export const optionChainQuerySchema = z.object({
  expiration: z.string().min(1),
});

export const cursorContractsQuerySchema = z.object({
  underlying: z.string().trim().min(1).regex(/^[A-Z0-9.:-]+$/i),
  cursor: z.string().optional(),
});

const watchlistSymbolInputSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  sector: z.string().optional(),
  enabled: z.boolean().optional(),
  addedAt: z.number().int().nonnegative().optional(),
});

export const watchlistBodySchema = z.object({
  watchlist: z.array(watchlistSymbolInputSchema),
});

export const watchlistAddSchema = watchlistSymbolInputSchema;
export const watchlistBulkSchema = z.object({
  symbols: z.array(watchlistSymbolInputSchema).nonempty(),
});

export type WatchlistInput = z.infer<typeof watchlistAddSchema>;

export const tradeIdParamSchema = z.object({ id: z.string().min(1) });

const tradeBaseSchema = z.object({
  symbol: z.string().trim().min(1),
  entryPrice: z.number(),
  stop: z.number(),
  target: z.number(),
  status: tradeStatusSchema,
});

export const tradeCreateSchema = tradeBaseSchema.extend({
  id: z.string().min(1).optional(),
});

export const tradeUpdateSchema = tradeBaseSchema.extend({
  id: z.string().min(1),
});

export const tradeDtoSchema = tradeUpdateSchema;

export type TradeDto = z.infer<typeof tradeDtoSchema>;

