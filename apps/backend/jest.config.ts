import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "<rootDir>/tsconfig.test.json"
      }
    ]
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^(?:\\.{1,2}/)*services/(.*)\\.js$": "<rootDir>/src/services/$1.ts"
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json",
      useESM: true
    }
  },
  setupFiles: ["<rootDir>/tests/jest.setup.cjs"],
  collectCoverageFrom: [
    "src/routes/marketData.ts",
    "src/routes/options.ts",
    "src/websocket/handler.ts"
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80
    }
  }
};

export default config;
