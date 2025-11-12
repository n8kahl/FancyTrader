import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@fancytrader\/shared\/server$/,
        replacement: path.resolve(__dirname, "..", "..", "packages", "shared", "src", "env.server.ts"),
      },
      {
        find: /^@fancytrader\/shared(.*)$/,
        replacement: path.resolve(__dirname, "..", "..", "packages", "shared", "src") + "$1",
      },
      {
        find: "@jest/globals",
        replacement: path.resolve(__dirname, "tests/jest-globals.ts"),
      },
    ],
  },
  test: {
    env: {
      NODE_ENV: "test",
      MASSIVE_API_KEY: "test_key",
      MASSIVE_REST_BASE: "https://api.massive.test",
      MASSIVE_WS_BASE: "wss://socket.massive.test",
      MASSIVE_AUTH_MODE: "header",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "supabase-service",
      SUPABASE_ANON_KEY: "supabase-anon",
      DISCORD_ENABLED: "false",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/test/test",
    },
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup.vitest.ts"],
    include: ["tests/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "tests/**/*.ts"],
      exclude: ["**/*.d.ts", "dist/**", "**/__fixtures__/**"],
    },
  },
});
