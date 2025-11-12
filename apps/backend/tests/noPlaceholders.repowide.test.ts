import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "@jest/globals";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "storybook-static",
  "playwright-report",
  ".turbo",
  ".vercel",
  ".cache",
]);

const TARGET_EXTENSIONS = new Set([".md", ".txt", ".sh", ".bat"]);
const TARGET_PATHS = ["docs", "apps/backend/README.md"];

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const candidate = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(candidate);
    } else {
      yield candidate;
    }
  }
}

describe("Repo-wide: no ellipsis stubs", () => {
  it("has no `...` anywhere in the docs", () => {
    const root = path.resolve(__dirname, "..", "..");
    const offenders: string[] = [];

    const checkFile = (file: string) => {
      const ext = path.extname(file);
      if (!TARGET_EXTENSIONS.has(ext)) return;
      const text = fs.readFileSync(file, "utf8");
      if (text.includes("...")) {
        offenders.push(path.relative(root, file));
      }
    };

    for (const target of TARGET_PATHS) {
      const resolved = path.resolve(root, target);
      if (!fs.existsSync(resolved)) continue;
      const stats = fs.statSync(resolved);
      if (stats.isFile()) {
        checkFile(resolved);
      } else if (stats.isDirectory()) {
        for (const file of walk(resolved)) {
          checkFile(file);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
