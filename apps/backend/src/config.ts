import { z } from "zod";

/**
 * Prefer `CORS_ALLOWLIST`; `ALLOWED_ORIGINS` exists for backward compatibility.
 */
const defaultAllowedOrigins =
  process.env.ALLOWED_ORIGINS ??
  process.env.CORS_ALLOWLIST ??
  "https://fancy-trader-front.up.railway.app";

const Env = z.object({
  NODE_ENV: z.string().default("production"),
  PORT: z.coerce.number().default(8080),
  ALLOWED_ORIGINS: z.string().default(defaultAllowedOrigins),
  MASSIVE_REST_BASE: z.string().default("https://api.massive.com"),
  MASSIVE_API_KEY: z.string().min(1, "MASSIVE_API_KEY is required"),
  MASSIVE_AUTH_MODE: z.enum(["query", "header"]).default("query"),
  MASSIVE_WS_BASE: z.string().default("wss://socket.massive.com"),
  MASSIVE_WS_CLUSTER: z.enum(["options"]).default("options"),
  STREAMING_ENABLED: z.string().optional(),
  FEATURE_ENABLE_MASSIVE_STREAM: z.string().optional(),
  HTTP_TIMEOUT_MS: z.coerce.number().default(5000),
  HEALTH_TIMEOUT_MS: z.coerce.number().default(2500),
  RATE_LIMIT_ENABLED: z.string().default("true"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  LOGGER_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const raw = Env.parse(process.env);

const asBool = (value?: string) => (value ?? "").toLowerCase() === "true";
const normalizeList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const Config = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  allowedOrigins: Object.freeze(normalizeList(raw.ALLOWED_ORIGINS)),
  massive: Object.freeze({
    restBase: raw.MASSIVE_REST_BASE,
    apiKey: raw.MASSIVE_API_KEY,
    authMode: raw.MASSIVE_AUTH_MODE,
    wsBase: raw.MASSIVE_WS_BASE,
    wsCluster: raw.MASSIVE_WS_CLUSTER,
    streamingEnabled: asBool(raw.STREAMING_ENABLED) || asBool(raw.FEATURE_ENABLE_MASSIVE_STREAM),
  }),
  timeouts: Object.freeze({
    http: raw.HTTP_TIMEOUT_MS,
    health: raw.HEALTH_TIMEOUT_MS,
  }),
  rateLimit: Object.freeze({
    enabled: asBool(raw.RATE_LIMIT_ENABLED),
    windowMs: raw.RATE_LIMIT_WINDOW_MS,
    max: raw.RATE_LIMIT_MAX,
  }),
  logging: Object.freeze({
    level: raw.LOGGER_LEVEL,
  }),
});

export const publicConfig = Object.freeze({
  nodeEnv: Config.nodeEnv,
  port: Config.port,
  allowedOrigins: Config.allowedOrigins,
  massive: {
    restBase: Config.massive.restBase,
    authMode: Config.massive.authMode,
    wsBase: Config.massive.wsBase,
    wsCluster: Config.massive.wsCluster,
    streamingEnabled: Config.massive.streamingEnabled,
  },
  timeouts: Config.timeouts,
  rateLimit: Config.rateLimit,
  logging: Config.logging,
});
