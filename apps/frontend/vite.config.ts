import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-hook-form@7.55.0": "react-hook-form",
      "@jsr/supabase__supabase-js@2.49.8": "@jsr/supabase__supabase-js",
      "@": path.resolve(__dirname, "./src"),
      "@fancytrader/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js"),
    },
  },
  build: {
    outDir: "build",
    target: "esnext",
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    alias: {
      "@fancytrader/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js"),
    },
    deps: {
      inline: [/^@fancytrader\/shared$/],
    },
  },
});
