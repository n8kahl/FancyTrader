import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useReadyz } from "../useReadyz";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("useReadyz", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ready=true when /readyz ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));
    const { result } = renderHook(() => useReadyz());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ready).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns error on non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: false }, { status: 503 })));
    const { result } = renderHook(() => useReadyz());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ready).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
