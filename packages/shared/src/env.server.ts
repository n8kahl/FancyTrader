import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MASSIVE_API_KEY: z.string().min(1, "MASSIVE_API_KEY is required"),
  MASSIVE_BASE_URL: z.string().url().default("https://api.massive.com"),
  MASSIVE_WS_BASE: z.string().url().default("wss://socket.massive.com"),
  MASSIVE_WS_CLUSTER: z
    .enum(["options", "indices", "stocks", "crypto", "forex"])
    .default("options"),
  FEATURE_ENABLE_MASSIVE_STREAM: z.coerce.boolean().default(false),
  FEATURE_POLYGON_ENABLED: z.coerce.boolean().default(false),
  FEATURE_MOCK_MODE: z.coerce.boolean().default(false),

  CORS_ALLOWLIST: z.string().default("http://localhost:5173"),
  REQUEST_BODY_LIMIT: z.string().default("1mb"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().default(25),

  WS_MAX_PAYLOAD_BYTES: z.coerce.number().default(1_000_000),
  WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().default(15_000),
  WS_IDLE_CLOSE_MS: z.coerce.number().default(60_000),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  DISCORD_ENABLED: z.coerce.boolean().default(false),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  DISCORD_TIMEOUT_MS: z.coerce.number().default(3000),
  DISCORD_MAX_RETRIES: z.coerce.number().default(3),
  DISCORD_RETRY_BASE_MS: z.coerce.number().default(200),

  ADMIN_KEY: z.string().min(1, "ADMIN_KEY is required"),
  ALLOWED_WS_ORIGINS: z.string().default(""),
  TRUST_PROXY: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof schema>;

export const serverEnv: ServerEnv = (() => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error("Invalid environment configuration:\n" + issues.join("\n"));
  }
  return parsed.data;
})();
