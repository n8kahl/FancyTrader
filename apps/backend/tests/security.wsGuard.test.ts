import { describe, expect, it, vi } from "vitest";

async function loadGuard(list?: string) {
  vi.resetModules();
  if (list !== undefined) {
    vi.doMock("@fancytrader/shared/server", () => ({
      serverEnv: {
        CORS_ALLOWLIST: list,
        LOG_LEVEL: "info",
        TRUST_PROXY: false,
        REQUEST_BODY_LIMIT: "1mb",
        NODE_ENV: "test",
        PORT: 3001,
        MASSIVE_REST_BASE: "https://api.massive.test",
        MASSIVE_WS_BASE: "wss://socket.massive.test",
        MASSIVE_WS_CLUSTER: "options",
        MASSIVE_API_KEY: "test",
        MASSIVE_AUTH_MODE: "query",
        FEATURE_MOCK_MODE: false,
        FEATURE_ENABLE_MASSIVE_STREAM: false,
        WS_MAX_PAYLOAD_BYTES: 1_000_000,
        WS_HEARTBEAT_INTERVAL_MS: 15_000,
        WS_IDLE_CLOSE_MS: 60_000,
        WS_RECONNECT_MAX_ATTEMPTS: 5,
        WS_RECONNECT_BASE_MS: 1_000,
        RATE_LIMIT_MAX: 60,
        RATE_LIMIT_WINDOW_MS: 60_000,
        RATE_LIMIT_WRITE_MAX: 25,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_KEY: "",
        SUPABASE_ANON_KEY: "",
        DISCORD_ENABLED: false,
        DISCORD_WEBHOOK_URL: "",
        ADMIN_KEY: "",
      },
    }));
  }
  const module = await import("../src/security/wsGuard");
  return module.isAllowedOrigin;
}

describe("wsGuard", () => {
  it("allows any origin when allowlist unset", async () => {
    const isAllowedOrigin = await loadGuard("");
    expect(isAllowedOrigin("https://example.com")).toBe(true);
  });

  it("allows configured origins and blocks others", async () => {
    const isAllowedOrigin = await loadGuard(
      "https://app.example.com,https://beta.example.com"
    );
    expect(isAllowedOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedOrigin("https://beta.example.com/page")).toBe(true);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("rejects missing origin", async () => {
    const isAllowedOrigin = await loadGuard("https://foo");
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});
