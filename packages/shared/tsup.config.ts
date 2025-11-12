import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/env.server.ts", "src/env.client.ts"],
  dts: true,
  format: ["esm", "cjs"],
  target: "es2020", // supports import.meta
  sourcemap: true,
  clean: true,
});
