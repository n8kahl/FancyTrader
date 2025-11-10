import fs from "node:fs";
import path from "node:path";
import {describe, it, expect} from "vitest";

const CHANGED = [
  "packages/shared/src/client/massive.ts",
  "apps/frontend/src/components/SessionIndicator.tsx",
  "apps/frontend/src/components/SessionIndicator.stories.tsx",
  "apps/frontend/.storybook/main.ts",
  "apps/frontend/.storybook/preview.ts",
  "apps/worker/src/clients/massive.ts",
  "apps/worker/src/index.ts",
  "apps/worker/tests/setup.ts",
  "apps/backend/src/services/massiveStreamingService.ts",
  "apps/backend/src/websocket/handler.ts",
  "apps/backend/tests/noPlaceholders.massiveClient.test.ts",
  "apps/backend/tests/noPlaceholders.sprint6.test.ts",
  "migrations/001_base_schema.sql",
  "migrations/005_indexes.sql",
  ".github/workflows/ci.yml",
  "e2e/live-market-status.spec.ts",
];

describe("Sprint 1–6 files contain no ellipsis stubs", () => {
  it("no '...' in changed files", () => {
    const root = path.resolve(__dirname, "..", "..");
    const offenders: string[] = [];
    for (const rel of CHANGED) {
      const fp = path.resolve(root, rel);
      const text = fs.readFileSync(fp, "utf8");
      if (text.includes("...")) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
