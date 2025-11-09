import { z } from "zod";
import { tradeStatusSchema } from "@fancytrader/shared";
import type { Snapshot, TradeLite, WatchlistItem, AlertCondition } from "@fancytrader/shared";
import type { StrategyParams } from "@fancytrader/shared";
import { API_ENDPOINTS } from "../config/backend";
import { logger } from "../utils/logger";
import { getUserId } from "../lib/user";
import type { Trade } from "@/types/trade";
import type { OptionsContract } from "@/types/options";

type UnknownRecord = Record<string, unknown>;

type DiscordShareAction =
  | "ENTRY"
  | "TRIM_25"
  | "TRIM_50"
  | "ADD"
  | "STOP_LOSS"
  | "TARGET_HIT"
  | "EXIT_ALL"
  | "CUSTOM";

export interface BackendSetup {
  id: string;
  symbol: string;
  setupType?: string;
  status?: string;
  direction?: Trade["direction"];
  entry?: number;
  entryPrice?: number;
  currentPrice?: number;
  targets?: number[];
  stopLoss?: number;
  riskReward?: string;
  riskRewardRatio?: string;
  change?: number;
  changePercent?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  confluenceScore?: number;
  confluenceFactors?: Trade["confluenceFactors"];
  confluenceDetails?: Trade["confluenceDetails"];
  conviction?: Trade["conviction"];
  timeframe?: string;
  dayType?: Trade["dayType"];
  marketPhase?: Trade["marketPhase"];
  phase?: Trade["marketPhase"];
  timestamp?: number;
  indicators?: Trade["indicators"];
  patientCandle?: Trade["patientCandle"];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface BacktestShareSummary {
  winRate: number;
  totalR: number;
  maxDrawdownR: number;
  expectancyR: number;
  trades?: number;
  symbol?: string;
  strategy?: string;
}

export interface BacktestSharePayload {
  summary: BacktestShareSummary;
  link?: string;
  note?: string;
}

export class ApiErrorEx extends Error implements ApiError {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiErrorEx";
    this.code = code;
    this.details = details;
  }
}

const watchlistItemSchema = z.object({
  symbol: z.string().min(1),
}).passthrough();

const watchlistResponseSchema = z.object({
  watchlist: z.array(watchlistItemSchema),
});

const watchlistMutationResponseSchema = z.object({
  ok: z.literal(true),
  item: watchlistItemSchema,
});

const lastTradeSchema = z.object({ p: z.number(), t: z.number() });
const prevCloseSchema = z.object({ c: z.number(), t: z.number() });
const closeSchema = z.object({ price: z.number(), timestamp: z.number() });

const snapshotEnvelopeSchema = z.object({
  symbol: z.string(),
  data: z.object({
    lastTrade: lastTradeSchema.optional(),
    prevClose: prevCloseSchema.optional(),
    close: closeSchema.optional(),
  }),
});

const healthSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  time: z.number(),
  uptimeSec: z.number(),
});

const marketSessionSchema = z.object({
  session: z.enum(["premarket", "regular", "aftermarket", "closed"]),
  nextOpen: z.string().nullable().optional(),
  nextClose: z.string().nullable().optional(),
  source: z.string(),
  raw: z.unknown().optional(),
});

const tradeLiteSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  entryPrice: z.number(),
  stop: z.number(),
  target: z.number(),
  status: tradeStatusSchema,
});
const tradesResponseSchema = z.union([
  z.object({ trades: z.array(tradeLiteSchema) }),
  z.array(tradeLiteSchema),
]);

const okResponseSchema = z.object({ ok: z.literal(true) });
const shareResponseSchema = z.object({ ok: z.literal(true), id: z.string() });

const alertSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  condition: z.discriminatedUnion("type", [
    z.object({ type: z.literal("priceAbove"), value: z.number() }),
    z.object({ type: z.literal("priceBelow"), value: z.number() }),
    z.object({ type: z.literal("crossesAbove"), value: z.number() }),
    z.object({ type: z.literal("crossesBelow"), value: z.number() }),
  ]),
  active: z.boolean(),
  lastTriggeredAt: z.number().optional(),
});

const backtestTradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  entryTime: z.string(),
  exitTime: z.string(),
  entryPrice: z.number(),
  exitPrice: z.number(),
  resultR: z.number(),
});

const weeklyBucketSchema = z.object({
  weekStart: z.string(),
  count: z.number(),
  winRate: z.number(),
  totalR: z.number(),
});

const backtestRunResponseSchema = z.object({
  summary: z.object({
    winRate: z.number(),
    totalR: z.number(),
    maxDrawdownR: z.number(),
    expectancyR: z.number(),
    trades: z.number().optional(),
    symbol: z.string().optional(),
    strategy: z.string().optional(),
  }),
  trades: z.array(backtestTradeSchema),
  buckets: z.array(weeklyBucketSchema),
});

const chartAnnotationSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  entry: z.number(),
  stop: z.number().nullable().optional(),
  targets: z.array(z.number()).optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

const chartAnnotationListSchema = z.object({
  annotations: z.array(chartAnnotationSchema),
});

const chartAnnotationResponseSchema = z.object({
  annotation: chartAnnotationSchema,
});

export type AlertRule = z.infer<typeof alertSchema>;
export type BacktestTradeResult = z.infer<typeof backtestTradeSchema>;
export type WeeklyBucket = z.infer<typeof weeklyBucketSchema>;
export type BacktestRunResult = z.infer<typeof backtestRunResponseSchema>;

export interface ChartAnnotation {
  id: string;
  symbol: string;
  entry: number;
  stop: number | null;
  targets: number[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChartAnnotationInput {
  symbol: string;
  entry: number;
  stop?: number | null;
  targets?: number[];
  notes?: string | null;
}

export type ChartAnnotationDraft = Omit<ChartAnnotationInput, "symbol">;
export type ChartAnnotationPatch = Partial<ChartAnnotationDraft> & { entry?: number };

export interface BacktestRunPayload {
  symbol: string;
  from: string;
  to: string;
  timespan: "minute" | "hour" | "day";
  limit?: number;
  strategyParams?: StrategyParams;
}

/**
 * API Client for backend communication
 */
class ApiClient {
  private async request(url: string, options?: RequestInit): Promise<Response> {
    const headers = new Headers(options?.headers ?? {});
    if (!headers.has("Content-Type") && options?.body) {
      headers.set("Content-Type", "application/json");
    }

    const shouldAttachUserId = (() => {
      try {
        const parsed = new URL(url);
        return parsed.pathname.startsWith("/api/");
      } catch {
        return url.startsWith("/api/");
      }
    })();

    if (shouldAttachUserId) {
      headers.set("x-user-id", getUserId());
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      logger.info(`🌐 API Request: ${options?.method || "GET"} ${url}`);

      const response = await this.request(url, options);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: ApiError } | null;
        const parsed = body?.error;
        const apiError = new ApiErrorEx(
          parsed?.message ?? `HTTP ${response.status}: ${response.statusText}`,
          parsed?.code ?? (response.status === 429 ? "RATE_LIMITED" : undefined),
          parsed?.details,
        );
        logger.error(`❌ API Error: ${response.status} ${response.statusText}`, apiError);
        throw apiError;
      }

      const data = (await response.json()) as T;
      logger.info(`✅ API Success: ${options?.method || "GET"} ${url}`);
      return data;
    } catch (error) {
      if (error instanceof ApiErrorEx) {
        logger.error(`❌ API request failed: ${url}`, error);
        throw error;
      }

      if (error instanceof Error) {
        if (
          error.message?.includes("fetch") ||
          error.name === "TypeError" ||
          error.message?.includes("Failed to fetch")
        ) {
          logger.error(`🔌 Backend not reachable at ${url}`, {
            message: error.message,
            name: error.name,
            type: "CONNECTION_ERROR",
          });
          throw new ApiErrorEx(`Cannot connect to backend at ${url}. Is it running?`, "NETWORK_ERROR");
        }

        logger.error(`❌ API request failed: ${url}`, error);
        throw new ApiErrorEx(error.message, "UNKNOWN");
      }

      logger.error(`❌ API request failed: ${url}`, { error });
      throw new ApiErrorEx("Unknown API error");
    }
  }

  // ============================================
  // SETUPS
  // ============================================

  /**
   * Get all active setups
   */
  async getSetups(strategyParams?: StrategyParams): Promise<Trade[]> {
    const url = this.appendStrategyParams(API_ENDPOINTS.getSetups(), strategyParams);
    const response = await this.fetch<{ setups: BackendSetup[] }>(url);
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Get setups for a specific symbol
   */
  async getSetupsBySymbol(symbol: string, strategyParams?: StrategyParams): Promise<Trade[]> {
    const url = this.appendStrategyParams(API_ENDPOINTS.getSetupsBySymbol(symbol), strategyParams);
    const response = await this.fetch<{ setups: BackendSetup[] }>(url);
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Get setup history for a user
   */
  async getSetupsHistory(userId: string): Promise<Trade[]> {
    const response = await this.fetch<{ setups: BackendSetup[] }>(
      API_ENDPOINTS.getSetupsHistory(userId)
    );
    return this.transformSetupsToTrades(response.setups);
  }

  /**
   * Delete a setup
   */
  async deleteSetup(setupId: string): Promise<void> {
    await this.fetch(API_ENDPOINTS.deleteSetup(setupId), {
      method: "DELETE",
    });
  }

  // ============================================
  // MARKET DATA
  // ============================================

  /**
   * Get current market snapshot for a symbol
   */
  async getSnapshot(symbol: string): Promise<Snapshot> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.getSnapshot(symbol));
    const envelope = snapshotEnvelopeSchema.parse(response);
    const { price, time } = resolveSnapshotValues(envelope.data);
    return { symbol: envelope.symbol, price, time };
  }

  /**
   * Get historical bars for a symbol
   */
  async getBars(
    symbol: string,
    params: {
      multiplier?: number;
      timespan?: "minute" | "hour" | "day";
      from: string; // YYYY-MM-DD
      to: string; // YYYY-MM-DD
      limit?: number;
    }
  ): Promise<UnknownRecord[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      ...(params.multiplier && { multiplier: params.multiplier.toString() }),
      ...(params.timespan && { timespan: params.timespan }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    const response = await this.fetch<{ bars: UnknownRecord[] }>(
      `${API_ENDPOINTS.getBars(symbol)}?${queryParams}`
    );
    return response.bars;
  }

  /**
   * Get previous close for a symbol
   */
  async getPreviousClose(symbol: string): Promise<UnknownRecord> {
    const response = await this.fetch<{ data: UnknownRecord }>(
      API_ENDPOINTS.getPreviousClose(symbol)
    );
    return response.data;
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<z.infer<typeof marketSessionSchema>> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.getMarketStatus());
    return marketSessionSchema.parse(response);
  }

  // ============================================
  // OPTIONS
  // ============================================

  // ============================================
  // TRADES
  // ============================================

  /**
   * Get lightweight trade summaries
   */
  async getTrades(): Promise<TradeLite[]> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.getTrades());
    const parsed = tradesResponseSchema.parse(response);
    return Array.isArray(parsed) ? parsed : parsed.trades;
  }

  /**
   * Persist a trade
   */
  async postTrade(trade: TradeLite): Promise<{ ok: true }> {
    const payload = tradeLiteSchema.parse(trade);
    const response = await this.fetch<unknown>(API_ENDPOINTS.postTrade(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return okResponseSchema.parse(response);
  }

  /**
   * Get options contracts for an underlying
   */
  async getOptionsContracts(
    underlying: string,
    params?: {
      expiration?: string;
      type?: "call" | "put";
      strike?: number;
    }
  ): Promise<OptionsContract[]> {
    const queryParams = new URLSearchParams();
    if (params?.expiration) queryParams.set("expiration", params.expiration);
    if (params?.type) queryParams.set("type", params.type);
    if (params?.strike) queryParams.set("strike", params.strike.toString());

    const url = `${API_ENDPOINTS.getOptionsContracts(underlying)}${
      queryParams.toString() ? `?${queryParams}` : ""
    }`;

    const response = await this.fetch<{ contracts: OptionsContract[] }>(url);
    return response.contracts;
  }

  /**
   * Get options snapshot
   */
  async getOptionsSnapshot(underlying: string, optionSymbol: string): Promise<UnknownRecord> {
    const response = await this.fetch<{ data: UnknownRecord }>(
      API_ENDPOINTS.getOptionsSnapshot(underlying, optionSymbol)
    );
    return response.data;
  }

  /**
   * Get full options chain
   */
  async getOptionsChain(
    underlying: string,
    expiration: string
  ): Promise<{ calls: OptionsContract[]; puts: OptionsContract[] }> {
    const response = await this.fetch<{ calls: OptionsContract[]; puts: OptionsContract[] }>(
      `${API_ENDPOINTS.getOptionsChain(underlying)}?expiration=${expiration}`
    );
    return response;
  }

  // ============================================
  // CHART ANNOTATIONS
  // ============================================

  async listChartAnnotations(symbol: string, userId: string): Promise<ChartAnnotation[]> {
    const url = new URL(API_ENDPOINTS.chartAnnotations());
    if (symbol) {
      url.searchParams.set("symbol", symbol);
    }
    const response = await this.fetch<unknown>(url.toString(), {
      headers: this.userHeaders(userId),
    });
    const parsed = chartAnnotationListSchema.parse(response);
    return parsed.annotations.map(normalizeAnnotation);
  }

  async createChartAnnotation(
    userId: string,
    payload: ChartAnnotationInput
  ): Promise<ChartAnnotation> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.chartAnnotations(), {
      method: "POST",
      headers: this.userHeaders(userId),
      body: JSON.stringify(payload),
    });
    const parsed = chartAnnotationResponseSchema.parse(response);
    return normalizeAnnotation(parsed.annotation);
  }

  async updateChartAnnotation(
    userId: string,
    id: string,
    patch: ChartAnnotationPatch
  ): Promise<ChartAnnotation> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.chartAnnotation(id), {
      method: "PUT",
      headers: this.userHeaders(userId),
      body: JSON.stringify(patch),
    });
    const parsed = chartAnnotationResponseSchema.parse(response);
    return normalizeAnnotation(parsed.annotation);
  }

  async deleteChartAnnotation(userId: string, id: string): Promise<{ ok: true }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.chartAnnotation(id), {
      method: "DELETE",
      headers: this.userHeaders(userId),
    });
    return okResponseSchema.parse(response);
  }

  // ============================================
  // WATCHLIST
  // ============================================
  // ============================================
  // BACKTEST & ALERTS
  // ============================================

  async runBacktest(payload: BacktestRunPayload): Promise<BacktestRunResult> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.runBacktest(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return backtestRunResponseSchema.parse(response);
  }

  async getBacktestCsv(payload: BacktestRunPayload): Promise<Blob> {
    const url = new URL(API_ENDPOINTS.getBacktestCsv());
    url.searchParams.set("symbol", payload.symbol);
    url.searchParams.set("from", payload.from);
    url.searchParams.set("to", payload.to);
    url.searchParams.set("timespan", payload.timespan);
    if (payload.limit) {
      url.searchParams.set("limit", String(payload.limit));
    }
    if (payload.strategyParams) {
      url.searchParams.set("strategyParams", JSON.stringify(payload.strategyParams));
    }

    const response = await this.request(url.toString());
    if (!response.ok) {
      throw new ApiErrorEx(`Failed to download backtest CSV (${response.status})`, "BACKTEST_CSV_ERROR");
    }
    return response.blob();
  }

  async listAlerts(): Promise<AlertRule[]> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.listAlerts());
    const parsed = z.object({ alerts: z.array(alertSchema) }).parse(response);
    return parsed.alerts;
  }

  async createAlert(payload: { symbol: string; condition: AlertCondition }): Promise<{ id: string }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.createAlert(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const parsed = z.object({ id: z.string() }).parse(response);
    return parsed;
  }

  async deleteAlert(id: string): Promise<{ ok: true }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.deleteAlert(id), {
      method: "DELETE",
    });
    return okResponseSchema.parse(response);
  }


  /**
   * Get user's watchlist
   */
  async getWatchlist(): Promise<WatchlistItem[]> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.getWatchlist());
    const parsed = watchlistResponseSchema.parse(response);
    return parsed.watchlist.map<WatchlistItem>(({ symbol }) => ({ symbol }));
  }

  /**
   * Add a symbol to the watchlist
   */
  async addToWatchlist(symbol: string): Promise<{ ok: true; item: WatchlistItem }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.addToWatchlist(), {
      method: "POST",
      body: JSON.stringify({ symbol }),
    });
    return watchlistMutationResponseSchema.parse(response);
  }

  /**
   * Remove a symbol from the watchlist
   */
  async removeFromWatchlist(symbol: string): Promise<{ ok: true }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.removeFromWatchlist(symbol), {
      method: "DELETE",
    });
    return okResponseSchema.parse(response);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check backend health
   */
  async checkHealth(): Promise<z.infer<typeof healthSchema>> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.health());
    return healthSchema.parse(response);
  }

  // ============================================
  // HELPERS
  // ============================================

  private appendStrategyParams(url: string, strategyParams?: StrategyParams): string {
    if (!strategyParams) {
      return url;
    }
    const target = new URL(url);
    target.searchParams.set("strategyParams", JSON.stringify(strategyParams));
    return target.toString();
  }

  /**
   * Transform backend setup format to frontend Trade format
   */
  private transformSetupsToTrades(setups: BackendSetup[]): Trade[] {
    return setups.map((setup) => {
      const entryPrice = setup.entryPrice ?? setup.entry;
      const currentPrice = setup.currentPrice ?? entryPrice ?? 0;
      const targets = Array.isArray(setup.targets) ? setup.targets : [];
      const primaryTarget = targets[0];

      return {
        id: setup.id,
        symbol: setup.symbol,
        setup: setup.setupType?.replace(/_/g, " + ") || "Unknown Setup",
        status: this.mapSetupStatus(setup.status),
        direction: setup.direction,
        price: currentPrice,
        change: setup.change ?? 0,
        changePercent: setup.changePercent ?? 0,
        entry: entryPrice,
        target: primaryTarget,
        stop: setup.stopLoss,
        riskReward: setup.riskReward || setup.riskRewardRatio,
        entryPrice,
        currentPrice,
        stopLoss: setup.stopLoss,
        targets,
        profitLoss: setup.profitLoss || 0,
        profitLossPercent: setup.profitLossPercent || 0,
        confluenceScore: setup.confluenceScore || 0,
        confluenceFactors: setup.confluenceFactors || [],
        confluenceDetails: setup.confluenceDetails || {},
        conviction: setup.conviction,
        timeframe: setup.timeframe || "5m",
        dayType: setup.dayType,
        marketPhase: setup.marketPhase || setup.phase,
        timestamp: setup.timestamp || Date.now(),
        indicators: setup.indicators || {},
        patientCandle: setup.patientCandle,
        tradeState: "SETUP",
        alertHistory: [],
      };
    });
  }

  /**
   * Map backend setup status to frontend status
   */
  private mapSetupStatus(backendStatus?: string): Trade["status"] {
    const statusMap: Record<string, Trade["status"]> = {
      SETUP_FORMING: "SETUP_FORMING",
      SETUP_READY: "SETUP_READY",
      MONITORING: "MONITORING",
      ACTIVE: "ACTIVE",
      PARTIAL_EXIT: "PARTIAL_EXIT",
      CLOSED: "CLOSED",
      DISMISSED: "DISMISSED",
    };

    if (!backendStatus) {
      return "MONITORING";
    }
    return statusMap[backendStatus] || "MONITORING";
  }

  private userHeaders(userId?: string): Record<string, string> {
    if (!userId) {
      throw new ApiErrorEx("Missing userId for this request", "USER_ID_REQUIRED");
    }
    return { "x-user-id": userId };
  }

  async shareTradeToDiscord(trade: Trade): Promise<{ id: string }> {
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `share-${Date.now()}-${Math.random()}`;
    const response = await this.fetch<unknown>(API_ENDPOINTS.shareTrade(), {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ trade }),
    });
    const parsed = shareResponseSchema.parse(response);
    return { id: parsed.id };
  }

  async shareBacktestToDiscord(payload: BacktestSharePayload): Promise<{ id: string }> {
    const response = await this.fetch<unknown>(API_ENDPOINTS.shareBacktest(), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const parsed = shareResponseSchema.parse(response);
    return { id: parsed.id };
  }

  async shareCustomDiscord(payload: {
    symbol: string;
    type: DiscordShareAction;
    content: string;
  }): Promise<{ id: string }> {
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `share-${Date.now()}-${Math.random()}`;
    const response = await this.fetch<unknown>(API_ENDPOINTS.shareCustom(), {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    });
    const parsed = z.object({ ok: z.literal(true), id: z.string() }).parse(response);
    return { id: parsed.id };
  }
}


function normalizeAnnotation(record: z.infer<typeof chartAnnotationSchema>): ChartAnnotation {
  return {
    id: record.id,
    symbol: record.symbol,
    entry: record.entry,
    stop: record.stop ?? null,
    targets: record.targets ?? [],
    notes: record.notes ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}


type SnapshotData = z.infer<typeof snapshotEnvelopeSchema>["data"];

function resolveSnapshotValues(data: SnapshotData): { price: number; time: number } {
  if (data.lastTrade) {
    return { price: data.lastTrade.p, time: data.lastTrade.t };
  }

  if (data.prevClose) {
    return { price: data.prevClose.c, time: data.prevClose.t };
  }

  if (data.close) {
    return { price: data.close.price, time: data.close.timestamp };
  }

  throw new Error("Snapshot response missing price data");
}

export const apiClient = new ApiClient();

export type MarketSessionResponse = z.infer<typeof marketSessionSchema>;
