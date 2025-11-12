import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
    alias: {
      "@jest/globals": "vitest",
    },
  },
});
