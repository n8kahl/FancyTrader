import { describe, it, expect, vi, afterEach } from "vitest";
import { waitFor, renderHook } from "@testing-library/react";
import { useReadyz } from "../useReadyz";

describe("useReadyz", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it(
    "marks down after two consecutive failures",
    async () => {
      vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("boom"))
        .mockRejectedValueOnce(new Error("boom"));
      const { result } = renderHook(() =>
        useReadyz(1, "http://test", { sessionPhase: "regular", mockMode: false })
      );

      await waitFor(
        () => {
          expect(result.current.status).toBe("down");
        },
        { timeout: 15000 }
      );
    },
    { timeout: 15000 }
  );

  it(
    "returns unknown when a failure is followed by success",
    async () => {
      vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        });
      const { result } = renderHook(() =>
        useReadyz(1, "http://test", { sessionPhase: "regular", mockMode: false })
      );

      await waitFor(
        () => {
          expect(result.current.status).toBe("unknown");
        },
        { timeout: 15000 }
      );
    },
    { timeout: 15000 }
  );
});
