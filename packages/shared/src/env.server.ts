import { z } from "zod";

const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),

    // CORS
    CORS_ALLOWLIST: z.string().default("http://localhost:5173,http://localhost:5174"),

    // Trust proxy / body limits
    TRUST_PROXY: z.coerce.boolean().default(false),
    REQUEST_BODY_LIMIT: z.string().default("1mb"),

    // Massive REST + WS
    MASSIVE_BASE_URL: z.string().url().default("https://api.massive.com"),
    MASSIVE_SOCKET_URL: z.string().url().default("wss://socket.massive.com/options"),

    // WS options used by app/index/handler
    MASSIVE_WS_BASE: z.string().url().default("wss://socket.massive.com/options"),
    MASSIVE_WS_CLUSTER: z.string().default("options"),

    // Feature flag to enable streaming
    FEATURE_ENABLE_MASSIVE_STREAM: z.coerce.boolean().default(true),

    // API key required if streaming enabled
    MASSIVE_API_KEY: z.string().min(1).optional(),

    // WebSocket server tuneables
    WS_MAX_PAYLOAD_BYTES: z.coerce.number().int().positive().default(2_000_000),
    WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
    WS_IDLE_CLOSE_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),

    // Optional diagnostics
    DISCORD_WEBHOOK_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.FEATURE_ENABLE_MASSIVE_STREAM && !env.MASSIVE_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["MASSIVE_API_KEY"],
        message: "MASSIVE_API_KEY is required when FEATURE_ENABLE_MASSIVE_STREAM=true",
      });
    }
  });

function readEnv(): Record<string, string | undefined> {
  return process.env as Record<string, string | undefined>;
}

export const serverEnv = (() => {
  const parsed = ServerEnvSchema.safeParse(readEnv());
  if (!parsed.success) {
    console.error("❌ Invalid server environment:");
    console.error(parsed.error.format());
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return ServerEnvSchema.parse({});
  }
  return parsed.data;
})();
