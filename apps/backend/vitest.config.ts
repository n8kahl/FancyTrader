import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@jest/globals": "vitest",
      jest: "vitest",
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/testSetup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
    },
  },
});
