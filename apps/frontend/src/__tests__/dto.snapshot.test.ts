import { describe, it, expect } from "vitest";
import { z } from "zod";

const Snapshot = z.object({
  symbol: z.string(),
  price: z.number(),
  time: z.number(),
});

describe("Snapshot schema", () => {
  it("accepts valid", () => {
    expect(Snapshot.safeParse({ symbol: "SPY", price: 499.12, time: Date.now() }).success).toBe(true);
  });

  it("rejects invalid", () => {
    expect(Snapshot.safeParse({ symbol: "SPY", price: "x", time: "y" }).success).toBe(false);
  });
});
