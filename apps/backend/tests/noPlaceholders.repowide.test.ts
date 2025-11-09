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
const IGNORE_FILES = [/\.lock$/, /\.map$/, /\.png$/, /\.jpg$/, /\.svg$/, /\.ico$/, /\.pdf$/, /\.snap$/];

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

describe("Repo-wide: no ellipsis stubs", () => {
  it("has no `...` anywhere", () => {
    const root = path.resolve(__dirname, "..", "..");
    const offenders: string[] = [];
    for (const file of walk(root)) {
      if (IGNORE_FILES.some((re) => re.test(file))) continue;
      const text = fs.readFileSync(file, "utf8");
      if (text.includes("...")) offenders.push(path.relative(root, file));
    }
    expect(offenders).toEqual([]);
  });
});
