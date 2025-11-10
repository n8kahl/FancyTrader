import { defineConfig } from "vitest/dist/config.js";

export default defineConfig({
  resolve: {
    alias: {
      "@jest/globals": "vitest",
      jest: "vitest",
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
    },
    setupFiles: ["./tests/testSetup.ts"],
  },
});
