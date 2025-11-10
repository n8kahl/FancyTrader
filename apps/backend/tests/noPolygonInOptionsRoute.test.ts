import fs from "node:fs";
import path from "node:path";
import { describe, it } from "@jest/globals";

const file = path.resolve(__dirname, "..", "src", "routes", "options.ts");

const enforce = process.env.ENFORCE_MASSIVE_ONLY === "1";
const testFn = enforce ? it : it.skip;

describe("Massive-only guard: options route", () => {
  testFn("does not import or instantiate PolygonClient (enable post-migration)", () => {
    const src = fs.readFileSync(file, "utf8");
    expect(src).not.toMatch(/PolygonClient/);
    expect(src).not.toMatch(/from\s+["'].*polygonClient["']/);
  });
});
