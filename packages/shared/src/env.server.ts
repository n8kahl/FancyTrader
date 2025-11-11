import { z } from "zod";

/**
 * Canonical server-side environment schema for all services.
 * Fail fast in production if anything critical is missing.
 */
const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),

    // Logging / trust proxy / body size
    LOG_LEVEL: z.string().default("info"),
    TRUST_PROXY: z.coerce.boolean().default(false),
    REQUEST_BODY_LIMIT: z.string().default("1mb"),

    // CORS (comma-separated)
    CORS_ALLOWLIST: z.string().default("http://localhost:5173,http://localhost:5174"),

    // Massive REST + WS
    MASSIVE_BASE_URL: z.string().url().default("https://api.massive.com"),
    MASSIVE_WS_BASE: z.string().url().default("wss://socket.massive.com"),
    MASSIVE_WS_CLUSTER: z.string().default("options"),
    MASSIVE_API_KEY: z.string().optional(),

    // Feature flags
    FEATURE_MOCK_MODE: z.coerce.boolean().default(false),
    FEATURE_ENABLE_MASSIVE_STREAM: z.coerce.boolean().default(true),

    // WebSocket controls
    WS_MAX_PAYLOAD_BYTES: z.coerce.number().int().positive().default(1_000_000),
    WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
    WS_IDLE_CLOSE_MS: z.coerce.number().int().positive().default(60_000),
    WS_RECONNECT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    WS_RECONNECT_BASE_MS: z.coerce.number().int().positive().default(1_000),

    // Rate limiting
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(25),

    // Supabase
    SUPABASE_URL: z.string().url().optional().default(""),
    SUPABASE_SERVICE_KEY: z.string().optional().default(""),
    SUPABASE_ANON_KEY: z.string().optional().default(""),

    // Discord notifications
    DISCORD_ENABLED: z.coerce.boolean().default(false),
    DISCORD_WEBHOOK_URL: z.string().optional().default(""),

    // Admin / ops
    ADMIN_KEY: z.string().optional().default(""),
  })
  .superRefine((env, ctx) => {
    if (env.FEATURE_ENABLE_MASSIVE_STREAM && !env.MASSIVE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MASSIVE_API_KEY"],
        message: "MASSIVE_API_KEY is required when FEATURE_ENABLE_MASSIVE_STREAM=true",
      });
    }
  });

function readEnv(): Record<string, string | undefined> {
  return process.env as Record<string, string | undefined>;
}

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export const serverEnv: ServerEnv = (() => {
  const parsed = ServerEnvSchema.safeParse(readEnv());
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid server environment:");
    // eslint-disable-next-line no-console
    console.error(parsed.error.format());
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return ServerEnvSchema.parse({});
  }
  return parsed.data;
})();
