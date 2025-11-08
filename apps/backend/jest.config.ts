import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json",
    },
  },
  setupFiles: ["<rootDir>/tests/jest.setup.ts"],
  collectCoverageFrom: [
    "src/routes/marketData.ts",
    "src/routes/options.ts",
    "src/websocket/handler.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
    },
  },
};

export default config;
