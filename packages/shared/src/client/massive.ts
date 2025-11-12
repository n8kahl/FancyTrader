import axios, { AxiosError, type AxiosInstance } from "axios";

export type MarketMode = "premarket" | "regular" | "aftermarket" | "closed";

export interface MassiveClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

type Retryable = { shouldRetry: boolean; retryAfterMs?: number };

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 5;

function computeRetry(err: unknown, attempt: number, maxRetries: number): Retryable {
  const e = err as AxiosError & { response?: { status?: number; headers?: Record<string, string> } };
  const status = e?.response?.status ?? 0;
  if (attempt >= maxRetries) return { shouldRetry: false };
  if (status === 429) {
    const ra = Number(e.response?.headers?.["retry-after"] ?? 0);
    return { shouldRetry: true, retryAfterMs: Number.isFinite(ra) ? ra * 1000 : 1000 * Math.pow(2, attempt) };
  }
  if (status >= 500 || e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
    return { shouldRetry: true, retryAfterMs: 500 * Math.pow(2, attempt) };
  }
  return { shouldRetry: false };
}

export class MassiveClient {
  private http: AxiosInstance;
  private maxRetries: number;

  constructor(opts: MassiveClientOptions) {
    this.http = axios.create({
      baseURL: opts.baseUrl.replace(/\/+$/, ""),
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
      headers: { Authorization: `Bearer ${opts.apiKey}` },
    });
    this.maxRetries = Math.max(0, opts.maxRetries ?? DEFAULT_MAX_RETRIES);
  }

  private async retrying<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (err) {
        const { shouldRetry, retryAfterMs } = computeRetry(err, attempt, this.maxRetries);
        if (!shouldRetry) throw err;
        await new Promise((r) => setTimeout(r, retryAfterMs ?? 0));
        attempt += 1;
      }
    }
  }

  async getMarketStatus(): Promise<{ session: MarketMode }> {
    return this.retrying(async () => {
      const { data } = await this.http.get("/v1/market/status");
      const s: string = String(data?.session ?? "closed").toLowerCase();
      const session: MarketMode = ["premarket", "regular", "aftermarket", "closed"].includes(s)
        ? (s as MarketMode)
        : "closed";
      return { session };
    });
  }

  async getIndexSnapshots(indices: string[]): Promise<{ results: unknown[] }> {
    if (!indices.length) return { results: [] };
    return this.retrying(async () => {
      const { data } = await this.http.get("/v3/snapshot/indices", { params: { symbols: indices.join(",") } });
      return data;
    });
  }

  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown> {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60_000);
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from.toISOString()}/${to.toISOString()}`,
        {
          params: { limit: 5000 },
        }
      );
      return data;
    });
  }

  async getOptionsChain(params: { underlying: string; limit?: number; page?: string }): Promise<{
    results: unknown[];
    next_page?: string | null;
  }> {
    return this.retrying(async () => {
      const { data } = await this.http.get("/v3/reference/options/contracts", {
        params: { underlying: params.underlying, limit: params.limit ?? 100, page: params.page ?? undefined },
      });
      return data;
    });
  }
}
