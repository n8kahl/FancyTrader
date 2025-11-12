import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/env.server.ts", "src/client/massive.ts"],
    dts: true,
    format: ["esm", "cjs"],
    target: "es2020",
    sourcemap: true,
    clean: true,
  },
  {
    entry: ["src/env.client.ts"],
    dts: true,
    format: ["esm"],
    target: "es2020",
    sourcemap: true,
    clean: false,
  },
]);
