import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

type BreakerState = "closed" | "open" | "half";

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 10_000;
const HALF_OPEN_DELAY_MS = 30_000;
const FAILURE_WINDOW = 20;
const MIN_SAMPLES_FOR_BREAKER = 5;
const BASE_DELAY_MS = 200;
const MAX_BACKOFF_MS = 3_000;

export interface HttpClientOptions extends AxiosRequestConfig {
  maxAttempts?: number;
}

const shouldRetryStatus = (status?: number): boolean => {
  if (!status) return false;
  if (status === 429) return true;
  return status >= 500 && status < 600;
};

const shouldRetryCode = (code?: string): boolean => {
  if (!code) return false;
  return code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNABORTED";
};

export class HttpClient {
  private failures: number[] = [];
  private state: BreakerState = "closed";
  private halfOpenUntil = 0;
  private readonly maxAttempts: number;

  constructor(private readonly baseUrl: string, private readonly defaults: HttpClientOptions = {}) {
    this.maxAttempts = Math.max(0, defaults.maxAttempts ?? MAX_ATTEMPTS);
  }

  private record(ok: boolean): void {
    this.failures.push(ok ? 0 : 1);
    if (this.failures.length > FAILURE_WINDOW) {
      this.failures.shift();
    }
    const errRate = this.failures.reduce((acc, value) => acc + value, 0) / Math.max(this.failures.length, 1);
    if (this.state === "closed" && errRate >= 0.5 && this.failures.length >= MIN_SAMPLES_FOR_BREAKER) {
      this.state = "open";
      this.halfOpenUntil = Date.now() + HALF_OPEN_DELAY_MS;
    } else if (this.state === "open" && Date.now() > this.halfOpenUntil) {
      this.state = "half";
    }
  }

  private assertCanAttempt(): void {
    if (this.state === "open" && Date.now() > this.halfOpenUntil) {
      this.state = "half";
    }
    if (this.state === "open") {
      throw new Error("CircuitOpen");
    }
  }

  private async delay(attempt: number): Promise<void> {
    const base = BASE_DELAY_MS * 2 ** attempt;
    const jitter = Math.random() * base;
    const wait = Math.min(base + jitter, MAX_BACKOFF_MS);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  async get<T = unknown>(url: string, config: HttpClientOptions = {}): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  async request<T = unknown>(config: HttpClientOptions = {}): Promise<AxiosResponse<T>> {
    this.assertCanAttempt();
    for (let attempt = 0; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await axios.request<T>(this.mergeConfig(config));
        this.record(true);
        if (this.state === "half") {
          this.state = "closed";
          this.failures = [];
        }
        return response;
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; code?: string };
        const retriable = shouldRetryCode(err.code) || shouldRetryStatus(err.response?.status);
        this.record(false);

        if (this.state === "half") {
          this.state = "open";
          this.halfOpenUntil = Date.now() + HALF_OPEN_DELAY_MS;
        }

        if (!retriable || attempt === MAX_ATTEMPTS) {
          throw error;
        }

        await this.delay(attempt);
        this.assertCanAttempt();
      }
    }
    throw new Error("HttpClientExhausted");
  }

  private mergeConfig(config: HttpClientOptions): AxiosRequestConfig {
    const { maxAttempts: _defaultMaxAttempts, ...defaultConfig } = this.defaults;
    const { maxAttempts: _requestMaxAttempts, ...requestConfig } = config;
    const headers = { ...(defaultConfig.headers ?? {}), ...(requestConfig.headers ?? {}) };
    const params = { ...(defaultConfig.params ?? {}), ...(requestConfig.params ?? {}) };
    const timeout = requestConfig.timeout ?? defaultConfig.timeout ?? TIMEOUT_MS;
    return {
      baseURL: this.baseUrl,
      timeout,
      ...defaultConfig,
      ...requestConfig,
      headers,
      params,
    };
  }
}
