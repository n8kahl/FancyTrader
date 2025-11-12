import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "env.client": "src/env.client.ts" },
    format: ["esm"],
    dts: true,
    target: "es2020",
    sourcemap: true,
    clean: true,
  },
  {
    entry: {
      "env.server": "src/env.server.ts",
      index: "src/index.ts",
      "client/massive": "src/client/massive.ts",
      "http/client": "src/http/client.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    target: "es2020",
    sourcemap: true,
    clean: false,
  },
]);
