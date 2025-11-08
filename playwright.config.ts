import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "pnpm --filter @fancytrader/frontend dev --host 0.0.0.0 --port 5173",
    url: "http://127.0.0.1:5173",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
