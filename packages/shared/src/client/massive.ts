import axios, { type AxiosInstance } from "axios";

export type MarketMode = "premarket" | "regular" | "aftermarket" | "closed";

export interface MassiveClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class MassiveClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;

  constructor(opts: MassiveClientOptions = {}) {
    const baseURL =
      opts.baseUrl ||
      process.env.MASSIVE_BASE_URL ||
      "https://api.massive.com";
    const apiKey = opts.apiKey || process.env.MASSIVE_API_KEY || "";
    const timeout = opts.timeoutMs ?? 10_000;
    this.maxRetries = Math.max(0, opts.maxRetries ?? 3);

    this.http = axios.create({
      baseURL,
      timeout,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      // Massive (Polygon) also accepts apiKey as query param; we prefer bearer.
    });
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (attempt >= this.maxRetries) throw error;
        const delay = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250;
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
      }
    }
  }

  // Market status (unchanged)
  async getMarketStatus(): Promise<{ market: string; [k: string]: unknown }> {
    return this.withRetry(async () => {
      const { data } = await this.http.get("/v1/marketstatus/now");
      return data ?? {};
    });
  }

  // ---------- INDICES ----------
  // Example symbols: "I:SPX", "I:NDX", "I:VIX"
  async getIndexSnapshot(indexSymbol: string): Promise<unknown> {
    return this.withRetry(async () => {
      const { data } = await this.http.get(
        `/v2/snapshot/locale/us/markets/indices/tickers/${encodeURIComponent(indexSymbol)}`
      );
      // Polygon snapshot shape returns { ticker: {...} }
      return data?.ticker ?? data ?? {};
    });
  }

  // Minute aggregates for indices/ETFs/underlyings
  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown[]> {
    return this.withRetry(async () => {
      const to = new Date();
      const from = new Date(to.getTime() - minutes * 60_000);
      const path = `/v2/aggs/ticker/${encodeURIComponent(
        symbol
      )}/range/1/minute/${from.toISOString()}/${to.toISOString()}`;
      const { data } = await this.http.get(path, {
        params: { adjusted: true, sort: "asc", limit: 50000 },
      });
      return Array.isArray(data?.results) ? data.results : [];
    });
  }

  // ---------- OPTIONS ----------
  // Full options contracts listings (reference)
  async getOptionsContracts(params: {
    underlying: string;
    expiration?: string;
    type?: "call" | "put";
    strike?: number;
    limit?: number;
  }): Promise<unknown> {
    return this.withRetry(async () => {
      const { underlying, expiration, type, strike, limit = 250 } = params;
      const { data } = await this.http.get(
        "/v3/reference/options/contracts",
        {
          params: {
            underlying_ticker: underlying,
            expiration_date: expiration,
            contract_type: type,
            strike_price: strike,
            limit,
          },
        }
      );
      return data ?? {};
    });
  }

  // Per-option live snapshot
  async getOptionSnapshot(underlying: string, optionSymbol: string): Promise<unknown> {
    return this.withRetry(async () => {
      const { data } = await this.http.get(
        `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(optionSymbol)}`
      );
      return data?.results ?? null;
    });
  }

  async getTickerSnapshot(symbol: string): Promise<unknown> {
    return this.withRetry(async () => {
      if (symbol.startsWith("O:")) {
        const underlying = symbol.slice(2).replace(/[^A-Z].*$/, "");
        const { data } = await this.http.get(
          `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(symbol)}`
        );
        return data?.results ?? {};
      }

      if (symbol.startsWith("I:")) {
        const idx = symbol.replace(/^I:/, "");
        const { data } = await this.http.get(
          `/v3/snapshot/indices/${encodeURIComponent(idx)}`
        );
        return data ?? {};
      }

      const underlying = symbol.toUpperCase();
      try {
        const { data } = await this.http.get(
          `/v3/snapshot/options/${encodeURIComponent(underlying)}`
        );
        return data?.results ?? data ?? {};
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const { data } = await this.http.get(
            `/v3/snapshot/options/${encodeURIComponent(underlying)}/summary`
          );
          return data?.results ?? data ?? {};
        }
        throw err;
      }
    });
  }
}

// Helpers: mapping market status to our worker mode
export function marketToMode(raw: any): MarketMode {
  const market = String(raw?.market ?? "").toLowerCase();
  if (market.includes("pre")) return "premarket";
  if (market.includes("after")) return "aftermarket";
  if (market.includes("open") || market.includes("regular")) return "regular";
  return "closed";
}
