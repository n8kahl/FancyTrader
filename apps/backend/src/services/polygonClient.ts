import axios, { AxiosInstance } from "axios";
import { z } from "zod";
import type { OptionContract } from "@fancytrader/shared/cjs";
import { logger } from "../utils/logger";
import { Bar } from "../types";
import { followNextUrls, encodeCursor, decodeCursor, type PageShape } from "../utils/polygonPage";
import { incPolygonRest } from "../utils/metrics";

const aggregateSchema = z.object({
  t: z.number(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
  vw: z.number().optional(),
});

const aggregatesResponseSchema = z.object({
  results: z.array(aggregateSchema).optional(),
});

const snapshotResponseSchema = z.object({
  ticker: z.unknown().optional(),
});

const marketStatusSchema = z.object({}).catchall(z.unknown());

const optionsSnapshotSchema = z.object({
  results: z.unknown().optional(),
});

const chainRowSchema = z.object({
  symbol: z.string().optional(),
  expiration_date: z.string(),
  contract_type: z.enum(["call", "put"]),
  strike_price: z.number(),
  last_price: z.number().nullable().optional(),
  bid: z.number().nullable().optional(),
  ask: z.number().nullable().optional(),
  days_to_expiration: z.number().optional(),
  greeks: z.object({ delta: z.number().optional() }).optional(),
  break_even_price: z.number().optional(),
  in_the_money: z.boolean().optional(),
  distance_from_underlying: z.number().optional(),
});

const chainResponseSchema = z.object({
  results: z.array(chainRowSchema).default([]),
});

const chainPagedResponseSchema = z.object({
  results: z.array(chainRowSchema).default([]),
  next_url: z.string().url().optional().nullable(),
});

const logError = (context: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`${context}:`, message);
};

const mapAggregate = (symbol: string, agg: z.infer<typeof aggregateSchema>): Bar => ({
  symbol,
  timestamp: agg.t,
  open: agg.o,
  high: agg.h,
  low: agg.l,
  close: agg.c,
  volume: agg.v,
  vwap: agg.vw,
});

const mapChainRow = (row: z.infer<typeof chainRowSchema>): OptionContract => {
  const expiration = row.expiration_date;
  const expirationDisplay = (() => {
    const parsed = new Date(expiration);
    return Number.isNaN(parsed.getTime())
      ? expiration
      : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  return {
    symbol: row.symbol ?? "",
    strike: row.strike_price,
    type: row.contract_type === "call" ? "CALL" : "PUT",
    expiration,
    expirationDisplay,
    daysToExpiry: row.days_to_expiration ?? 0,
    premium: row.last_price ?? 0,
    delta: row.greeks?.delta ?? 0,
    breakEven: row.break_even_price ?? row.strike_price,
    isITM: row.in_the_money ?? false,
    distanceFromPrice: row.distance_from_underlying ?? 0,
    projectedProfit: undefined,
    projectedProfitPercent: undefined,
  };
};

export class PolygonClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = "https://api.polygon.io";

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`.trim(),
    };
  }

  private buildOptionsContractsUrl(underlying: string): string {
    const params = new URLSearchParams({
      underlying_ticker: underlying,
      limit: "250",
    });
    return `${this.baseUrl}/v3/reference/options/contracts?${params.toString()}&apiKey=${this.apiKey}`;
  }

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("POLYGON_API_KEY is required");
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        apiKey: this.apiKey,
      },
      timeout: 10000,
    });
  }

  async getAggregates(
    symbol: string,
    multiplier = 1,
    timespan: "minute" | "hour" | "day" = "minute",
    from: string,
    to: string,
    limit = 50000
  ): Promise<Bar[]> {
    try {
      const response = await this.client.get(
        `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        { params: { adjusted: true, sort: "asc", limit } }
      );
      incPolygonRest(true, response.status);

      const data = aggregatesResponseSchema.parse(response.data);
      const results = data.results ?? [];
      return results.map((bar) => mapAggregate(symbol, bar));
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError(`Error fetching aggregates for ${symbol}`, error);
      throw error;
    }
  }

  async getSnapshot(symbol: string): Promise<unknown> {
    try {
      const response = await this.client.get(
        `/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`
      );
      incPolygonRest(true, response.status);
      const data = snapshotResponseSchema.parse(response.data);
      return data.ticker;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError(`Error fetching snapshot for ${symbol}`, error);
      throw error;
    }
  }

  async getOptionsContracts(
    underlying: string,
    expiration?: string,
    contractType?: "call" | "put",
    strikePrice?: number
  ): Promise<OptionContract[]> {
    try {
      const params: Record<string, unknown> = {
        underlying_ticker: underlying,
        limit: 250,
      };

      if (expiration) params.expiration_date = expiration;
      if (contractType) params.contract_type = contractType;
      if (strikePrice !== undefined) params.strike_price = strikePrice;

      const response = await this.client.get("/v3/reference/options/contracts", { params });
      const parsed = chainResponseSchema.parse(response.data);
      return parsed.results.map(mapChainRow);
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError(`Error fetching options contracts for ${underlying}`, error);
      throw error;
    }
  }


  async listOptionsContractsPaged(
    underlying: string,
    cursor?: string
  ): Promise<{ items: OptionContract[]; nextCursor?: string }> {
    try {
      const startUrl = cursor ? decodeCursor(cursor) : undefined;
      if (cursor && !startUrl) {
        throw new Error("INVALID_CURSOR");
      }

      const initialUrl = startUrl ?? this.buildOptionsContractsUrl(underlying.toUpperCase());

      const { items, lastUrl } = await followNextUrls<
        OptionContract,
        z.infer<typeof chainRowSchema>
      >(
        initialUrl,
        this.buildHeaders(),
        (payload) => chainPagedResponseSchema.parse(payload) as PageShape<z.infer<typeof chainRowSchema>>,
        (row) => mapChainRow(row)
      );

      return { items, nextCursor: encodeCursor(lastUrl) };
    } catch (error) {
      logError(`Error paging options contracts for ${underlying}`, error);
      throw error;
    }
  }


  async getOptionsSnapshot(underlyingSymbol: string, optionSymbol: string): Promise<unknown> {
    try {
      const response = await this.client.get(
        `/v3/snapshot/options/${underlyingSymbol}/${optionSymbol}`
      );
      incPolygonRest(true, response.status);
      const data = optionsSnapshotSchema.parse(response.data);
      return data.results ?? null;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError("Error fetching options snapshot", error);
      throw error;
    }
  }

  async getPreviousClose(symbol: string): Promise<Bar | null> {
    try {
      const response = await this.client.get(`/v2/aggs/ticker/${symbol}/prev`);
      incPolygonRest(true, response.status);
      const data = aggregatesResponseSchema.parse(response.data);
      const bar = data.results?.[0];
      return bar ? mapAggregate(symbol, bar) : null;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError(`Error fetching previous close for ${symbol}`, error);
      return null;
    }
  }

  async getMarketStatus(): Promise<unknown> {
    try {
      const response = await this.client.get("/v1/marketstatus/now");
      incPolygonRest(true, response.status);
      return marketStatusSchema.parse(response.data);
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      incPolygonRest(false, status);
      logError("Error fetching market status", error);
      throw error;
    }
  }
}
