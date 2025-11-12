import { HttpClient } from "../http/client";

export type MarketMode = "premarket" | "regular" | "aftermarket" | "closed";

export interface MassiveClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class MassiveClient {
  private readonly http: HttpClient;

  constructor(opts: MassiveClientOptions) {
    const baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.http = new HttpClient(baseUrl, {
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`.trim(),
      },
      maxAttempts: Math.max(0, opts.maxRetries ?? 5),
    });
  }

  async getMarketStatus(): Promise<{ session: MarketMode }> {
    const response = await this.http.get<{ session?: string; market?: string }>("/v1/market/status");
    const session = marketToMode(response.data);
    return { session };
  }

  async getIndexSnapshots(indices: string[]): Promise<{ results: unknown[] }> {
    if (!indices.length) return { results: [] };
    const response = await this.http.get<{ results: unknown[] }>("/v3/snapshot/indices", {
      params: { symbols: indices.join(",") },
    });
    return response.data;
  }

  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown> {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60_000);
    const response = await this.http.get<unknown>(
      `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from.toISOString()}/${to.toISOString()}`,
      {
        params: { limit: 5000 },
      }
    );
    return response.data;
  }

  async getOptionsChain(params: { underlying: string; limit?: number; page?: string }): Promise<{
    results: unknown[];
    next_page?: string | null;
  }> {
    const response = await this.http.get<{
      results: unknown[];
      next_page?: string | null;
    }>("/v3/reference/options/contracts", {
      params: { underlying: params.underlying, limit: params.limit ?? 100, page: params.page ?? undefined },
    });
    return response.data;
  }

  async getOptionSnapshot(underlying: string, optionSymbol: string): Promise<unknown> {
    const response = await this.http.get<unknown>(
      `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(optionSymbol)}`
    );
    return response.data;
  }
}

export type MarketStatusInput = { session?: string } | { market?: string } | string | null | undefined;

function normalizeMarketMode(raw?: string | null): MarketMode {
  const value = String(raw ?? "").toLowerCase();
  if (["pre", "premarket", "early", "early_trading"].some((token) => value.includes(token))) {
    return "premarket";
  }
  if (["open", "regular"].some((token) => value.includes(token))) {
    return "regular";
  }
  if (["after", "aftermarket", "late", "late_trading", "post"].some((token) => value.includes(token))) {
    return "aftermarket";
  }
  return "closed";
}

export function marketToMode(input?: MarketStatusInput): MarketMode {
  if (typeof input === "string") {
    return normalizeMarketMode(input);
  }
  if (input && "session" in input && input.session) {
    return normalizeMarketMode(input.session);
  }
  if (input && "market" in input && input.market) {
    return normalizeMarketMode(input.market);
  }
  return "closed";
}
