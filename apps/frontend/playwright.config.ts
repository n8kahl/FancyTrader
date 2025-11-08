import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { headless: true, baseURL: "http://localhost:5173" },
  reporter: "line",
});
