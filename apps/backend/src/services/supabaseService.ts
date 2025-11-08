import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { setupTypeSchema } from "@fancytrader/shared/cjs";
import { DetectedSetup, WatchlistSymbol, StrategyConfig } from "../types";
import { logger } from "../utils/logger";

const kvRowSchema = z.object({
  value: z.string(),
});

const kvRowsSchema = z.array(kvRowSchema);

const barSchema = z.object({
  symbol: z.string(),
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  vwap: z.number().optional(),
});

const technicalIndicatorsSchema = z.object({
  ema9: z.number().optional(),
  ema21: z.number().optional(),
  ema50: z.number().optional(),
  sma200: z.number().optional(),
  rsi14: z.number().optional(),
  vwap: z.number().optional(),
  atr: z.number().optional(),
});

const confluenceFactorSchema = z.object({
  factor: z.string(),
  present: z.boolean(),
  value: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional(),
});

const setupStatusSchema = z.enum([
  "SETUP_FORMING",
  "SETUP_READY",
  "MONITORING",
  "ACTIVE",
  "PARTIAL_EXIT",
  "CLOSED",
  "DISMISSED",
]);

const detectedSetupSchema: z.ZodType<DetectedSetup> = z
  .object({
    id: z.string(),
    symbol: z.string(),
    setupType: setupTypeSchema,
    status: setupStatusSchema,
    direction: z.enum(["LONG", "SHORT"]),
    timeframe: z.string(),
    entryPrice: z.number().optional(),
    stopLoss: z.number().optional(),
    targets: z.array(z.number()).optional(),
    confluenceScore: z.number(),
    confluenceFactors: z.array(confluenceFactorSchema),
    patientCandle: barSchema.optional(),
    indicators: technicalIndicatorsSchema,
    timestamp: z.number(),
    lastUpdate: z.number(),
  })
  .passthrough();

const watchlistSymbolSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  sector: z.string().optional(),
  enabled: z.boolean().optional(),
  addedAt: z.number().optional(),
});

const watchlistArraySchema = z.array(watchlistSymbolSchema);

const strategyConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  category: z.string(),
  timeframes: z.array(z.string()),
  minConfluence: z.number(),
});

const strategyConfigArraySchema = z.array(strategyConfigSchema);

const parseStoredJson = <T>(value: string, schema: z.ZodType<T>): T => {
  const parsed = JSON.parse(value) as unknown;
  return schema.parse(parsed);
};

const normalizeWatchlistSymbol = (symbol: z.infer<typeof watchlistSymbolSchema>): WatchlistSymbol => ({
  symbol: symbol.symbol,
  name: symbol.name,
  sector: symbol.sector,
  enabled: symbol.enabled ?? true,
  addedAt: symbol.addedAt ?? Date.now(),
});

export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private enabled: boolean;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    this.enabled = !!(supabaseUrl && supabaseKey);

    if (this.enabled && supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      logger.info("Supabase service initialized");
    } else {
      logger.warn("Supabase not configured. Data persistence disabled.");
    }
  }

  async saveSetup(setup: DetectedSetup): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase.from("kv_store_c59dbecd").upsert({
        key: `setup:${setup.id}`,
        value: JSON.stringify(setup),
      });

      if (error) {
        logger.error("Error saving setup to Supabase", { error });
      }
    } catch (error: unknown) {
      logger.error("Failed to save setup", { error });
    }
  }

  async getSetups(): Promise<DetectedSetup[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("kv_store_c59dbecd")
        .select("key, value")
        .like("key", "setup:%");

      if (error) {
        logger.error("Error fetching setups from Supabase", { error });
        return [];
      }

      const rows = kvRowsSchema.parse(data ?? []);
      return rows.map((row) => parseStoredJson(row.value, detectedSetupSchema));
    } catch (error: unknown) {
      logger.error("Failed to fetch setups", { error });
      return [];
    }
  }

  async saveWatchlist(userId: string, watchlist: WatchlistSymbol[]): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase.from("kv_store_c59dbecd").upsert({
        key: `watchlist:${userId}`,
        value: JSON.stringify(watchlist),
      });

      if (error) {
        logger.error("Error saving watchlist to Supabase", { error });
      }
    } catch (error: unknown) {
      logger.error("Failed to save watchlist", { error });
    }
  }

  async getWatchlist(userId: string): Promise<WatchlistSymbol[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("kv_store_c59dbecd")
        .select("value")
        .eq("key", `watchlist:${userId}`)
        .single();

      if (error || !data) {
        return [];
      }

      const parsedRow = kvRowSchema.parse(data);
      const stored = parseStoredJson(parsedRow.value, watchlistArraySchema);
      return stored.map(normalizeWatchlistSymbol);
    } catch (error: unknown) {
      logger.error("Failed to fetch watchlist", { error });
      return [];
    }
  }

  async saveStrategyConfig(userId: string, configs: StrategyConfig[]): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase.from("kv_store_c59dbecd").upsert({
        key: `strategies:${userId}`,
        value: JSON.stringify(configs),
      });

      if (error) {
        logger.error("Error saving strategy config to Supabase", { error });
      }
    } catch (error: unknown) {
      logger.error("Failed to save strategy config", { error });
    }
  }

  async getStrategyConfig(userId: string): Promise<StrategyConfig[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("kv_store_c59dbecd")
        .select("value")
        .eq("key", `strategies:${userId}`)
        .single();

      if (error || !data) {
        return [];
      }

      const parsedRow = kvRowSchema.parse(data);
      return parseStoredJson(parsedRow.value, strategyConfigArraySchema);
    } catch (error: unknown) {
      logger.error("Failed to fetch strategy config", { error });
      return [];
    }
  }

  async deleteSetup(setupId: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("kv_store_c59dbecd")
        .delete()
        .eq("key", `setup:${setupId}`);

      if (error) {
        logger.error("Error deleting setup from Supabase", { error });
      }
    } catch (error: unknown) {
      logger.error("Failed to delete setup", { error });
    }
  }
}
