import { describe, it, expect } from "vitest";
import { wsOutboundSchema } from "@fancytrader/shared";

describe("ServerOutbound schema", () => {
  it("accepts price update", () => {
    expect(
      wsOutboundSchema.safeParse({ type: "PRICE_UPDATE", symbol: "QQQ", price: 1, time: Date.now() }).success
    ).toBe(true);
  });

  it("rejects malformed", () => {
    expect(wsOutboundSchema.safeParse({ type: "PRICE_UPDATE", price: "x" }).success).toBe(false);
  });
});
