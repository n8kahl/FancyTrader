import axios, { AxiosError, type AxiosInstance } from "axios";

export type MarketMode = "premarket" | "regular" | "aftermarket" | "closed";

export interface MassiveClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_RETRIES = 5;

function isRetryableStatus(status?: number): boolean {
  if (!status) return false;
  if (status === 429) return true;
  return status >= 500 && status < 600;
}

function computeRetryAfter(error: AxiosError): number | undefined {
  const header = error.response?.headers?.["retry-after"];
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  return undefined;
}

function backoffWithJitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs;
}

export class MassiveClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  private breakerState: "closed" | "open" | "half" = "closed";
  private failures: number[] = [];

  constructor(opts: MassiveClientOptions = {}) {
    const baseURL = (opts.baseUrl ?? process.env.MASSIVE_BASE_URL ?? "https://api.massive.com").replace(/\/+$/, "");
    const apiKey = opts.apiKey ?? process.env.MASSIVE_API_KEY;
    if (!apiKey) throw new Error("Missing MASSIVE_API_KEY");
    this.http = axios.create({
      baseURL,
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
      headers: {
        "user-agent": process.env.HTTP_USER_AGENT ?? "FancyTrader/1.0",
      },
      params: { apiKey },
    });
    this.maxRetries = Math.max(0, opts.maxRetries ?? DEFAULT_MAX_RETRIES);
  }

  private noteFailure(now = Date.now()) {
    this.failures.push(now);
    if (this.failures.length > 20) this.failures.shift();
    const recent = this.failures.filter((ts) => ts >= now - 30_000).length;
    if (recent >= 5 && this.breakerState === "closed") {
      this.breakerState = "open";
      setTimeout(() => {
        this.breakerState = "half";
      }, 30_000);
    }
  }

  private noteSuccess() {
    if (this.breakerState !== "closed") {
      this.breakerState = "closed";
      this.failures = [];
    }
  }

  private async retrying<T>(fn: () => Promise<T>): Promise<T> {
    if (this.breakerState === "open") throw new Error("CircuitOpen");
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        this.noteSuccess();
        return result;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        if (!isRetryableStatus(status) || attempt === this.maxRetries) {
          this.noteFailure();
          throw error;
        }
        const retryAfterMs = computeRetryAfter(axiosError);
        const baseDelay = retryAfterMs ?? 200 * 2 ** attempt;
        const wait = Math.min(backoffWithJitter(baseDelay), 3000);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
    throw new Error("RetryAttemptsExceeded");
  }

  async getMarketStatus(): Promise<{ market: string; [k: string]: unknown }> {
    return this.retrying(async () => {
      const { data } = await this.http.get("/v1/marketstatus/now");
      return data ?? {};
    });
  }

  async getTickerSnapshot(symbol: string): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}`
      );
      return data?.ticker ?? data ?? {};
    });
  }

  async getMinuteAggs(symbol: string, minutes = 30): Promise<unknown> {
    const to = new Date();
    const from = new Date(to.getTime() - minutes * 60_000);
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from.getTime()}/${to.getTime()}`,
        { params: { sort: "asc", limit: 5000 } }
      );
      return data ?? {};
    });
  }

  async getOptionSnapshot(underlying: string, contract: string): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(
        `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contract)}`
      );
      return data ?? {};
    });
  }

  async getOptionQuote(contract: string): Promise<unknown> {
    return this.retrying(async () => {
      const { data } = await this.http.get(`/v3/quotes/${encodeURIComponent(contract)}`);
      return data ?? {};
    });
  }
}

export function marketToMode(raw: unknown): MarketMode {
  type MarketPayload = { market?: string; status?: string };
  const payload = typeof raw === "object" && raw !== null ? (raw as MarketPayload) : undefined;
  const text = String(payload?.market ?? payload?.status ?? "").toLowerCase();
  if (text.includes("pre")) return "premarket";
  if (text.includes("after") || text.includes("post")) return "aftermarket";
  if (text.includes("open") || text.includes("regular")) return "regular";
  return "closed";
}
