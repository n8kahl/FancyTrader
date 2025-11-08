import { defineConfig } from "vitest/config";

const nodeMajor = Number(process.versions.node.split(".")[0]);
const isNode22Plus = Number.isFinite(nodeMajor) && nodeMajor >= 22;
const coverageInclude = [
  "src/components/OptionsChain.tsx",
  "src/components/WatchlistManager.tsx",
];
if (!isNode22Plus) {
  coverageInclude.unshift("src/hooks/useBackendConnection.ts");
}

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      lines: 80,
      branches: 80,
      include: coverageInclude,
    },
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
