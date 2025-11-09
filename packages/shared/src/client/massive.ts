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
    });
  }

  private isOptionTicker(t: string): boolean {
    return /^O:/.test(t);
  }

  private isIndexTicker(t: string): boolean {
    return /^I:/.test(t);
  }

  private parseUnderlyingFromOption(t: string): string {
    const raw = t.replace(/^O:/, "");
    const m = raw.match(/^([A-Z\.]+)[0-9]/);
    return m ? m[1] : raw;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }
        const delay = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }

  async getMarketStatus(): Promise<{ market: string; [key: string]: unknown }> {
    return this.withRetry(async () => {
      const { data } = await this.http.get("/v1/marketstatus/now");
      return data ?? {};
    });
  }

  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown[]> {
    return this.withRetry(async () => {
      const to = new Date();
      const from = new Date(to.getTime() - minutes * 60_000);
      const path = `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from.toISOString()}/${to.toISOString()}`;
      const { data } = await this.http.get(path, {
        params: { adjusted: true, sort: "asc", limit: minutes },
      });
      return Array.isArray(data?.results) ? data.results : [];
    });
  }

  async getTickerSnapshot(symbol: string): Promise<unknown> {
    return this.withRetry(async () => {
      if (this.isOptionTicker(symbol)) {
        const underlying = this.parseUnderlyingFromOption(symbol);
        const { data } = await this.http.get(
          `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(symbol)}`
        );
        return data?.results ?? {};
      }

      if (this.isIndexTicker(symbol)) {
        const idx = symbol.replace(/^I:/, "");
        const { data } = await this.http.get(
          `/v3/snapshot/indices/${encodeURIComponent(idx)}`
        );
        return data ?? {};
      }

      const { data } = await this.http.get(
        `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}`
      );
      return data?.ticker ?? {};
    });
  }
}

export function marketToMode(raw: any): MarketMode {
  const market = String(raw?.market ?? "").toLowerCase();
  if (market.includes("pre")) return "premarket";
  if (market.includes("after")) return "aftermarket";
  if (market.includes("open") || market.includes("regular")) return "regular";
  return "closed";
}
