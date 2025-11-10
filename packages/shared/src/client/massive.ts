import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

export type MarketMode = "premarket" | "regular" | "aftermarket" | "closed";

export interface MassiveClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

type Retryable = { shouldRetry: boolean; retryAfterMs?: number };

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 5;

function isRetryableStatus(status?: number): boolean {
  if (!status) return false;
  if (status === 429) return true;
  return status >= 500 && status < 600;
}

function computeRetryAfter(e: AxiosError): number | undefined {
  const ra = e.response?.headers?.["retry-after"];
  if (!ra) return undefined;
  const sec = Number(ra);
  return Number.isFinite(sec) ? sec * 1000 : undefined;
}

function withJitter(baseMs: number): number {
  const jitter = Math.random() * baseMs;
  return baseMs + jitter;
}

export class MassiveClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  private breakerState: "closed" | "open" | "half" = "closed";
  private failures: number[] = [];

  constructor(opts: MassiveClientOptions = {}) {
    const baseURL = (opts.baseUrl || process.env.MASSIVE_BASE_URL || "https://api.massive.com").replace(/\/+$/, "");
    const apiKey = opts.apiKey || process.env.MASSIVE_API_KEY || "";
    if (!apiKey) {
      throw new Error("Missing MASSIVE_API_KEY");
    }
    this.http = axios.create({
      baseURL,
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
      headers: {
        "user-agent": process.env.HTTP_USER_AGENT ?? "FancyTrader/1.0",
        "x-api-key": apiKey,
      },
    });
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private noteFailure(now = Date.now()) {
    this.failures.push(now);
    if (this.failures.length > 20) this.failures.shift();
    const windowStart = now - 30_000;
    const recent = this.failures.filter((t) => t >= windowStart).length;
    if (recent >= 5 && this.breakerState === "closed") {
      this.breakerState = "open";
      setTimeout(() => (this.breakerState = "half"), 30_000);
    } else if (this.breakerState === "half") {
      // remain half until a success flips it to closed
    }
  }

  private noteSuccess() {
    if (this.breakerState !== "closed") {
      this.breakerState = "closed";
      this.failures = [];
    }
  }

  private async retrying<T>(fn: () => Promise<T>): Promise<T> {
    if (this.breakerState === "open") {
      throw new Error("CircuitOpen");
    }
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const out = await fn();
        this.noteSuccess();
        return out;
      } catch (e) {
        const ax = e as AxiosError;
        const status = ax?.response?.status;
        const retryable = isRetryableStatus(status);
        if (!retryable || attempt === this.maxRetries) {
          this.noteFailure();
          throw e;
        }
        const ra = computeRetryAfter(ax);
        const base = ra ?? 200 * 2 ** attempt;
        const wait = Math.min(withJitter(base), 3000);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw new Error("retrying exhausted unexpectedly");
  }

  async getMarketStatus(): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(`/v3/market/status`);
      return data;
    });
  }

  async getIndexSnapshots(indices: string[]): Promise<unknown> {
    if (!indices.length) return { results: [] };
    return this.retrying(async () => {
      const { data } = await this.http.get(`/v3/snapshot/indices`, {
        params: { symbols: indices.join(",") },
      });
      return data;
    });
  }

  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown> {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60_000);
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from.toISOString()}/${to.toISOString()}`,
        { params: { sort: "asc", limit: 5000 } }
      );
      return data;
    });
  }

  async getOptionSnapshot(underlying: string, contract: string): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contract)}`
      );
      return data;
    });
  }

  async getOptionQuote(contract: string): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(`/v3/quotes/${encodeURIComponent(contract)}`);
      return data;
    });
  }
}

export function marketToMode(raw: any): MarketMode {
  const s = String(raw?.market ?? raw?.status ?? "").toLowerCase();
  if (s.includes("pre")) return "premarket";
  if (s.includes("after") || s.includes("post")) return "aftermarket";
  if (s.includes("open") || s.includes("regular")) return "regular";
  return "closed";
}
