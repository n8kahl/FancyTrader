import fs from "node:fs";
import path from "node:path";
import {describe, it, expect} from "vitest";

describe("No placeholders in MassiveClient", () => {
  it("packages/shared/src/client/massive.ts has no '...'", () => {
    const root = path.resolve(__dirname, "..", "..");
    const file = path.resolve(root, "packages", "shared", "src", "client", "massive.ts");
    const text = fs.readFileSync(file, "utf8");
    expect(text.includes("...")).toBe(false);
  });
});
