import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SessionIndicator } from "../SessionIndicator";
import { apiClient } from "../../services/apiClient";

describe("SessionIndicator", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders regular session chip", async () => {
    const spy = vi
      .spyOn(apiClient, "getMarketStatus")
      .mockResolvedValue({ session: "regular", nextOpen: null, nextClose: null, source: "massive" });

    render(<SessionIndicator />);

    const indicator = await screen.findByLabelText("session-indicator");
    expect(indicator.textContent?.replace(/\s+/g, "")).toContain("Session:Regular");
    expect(spy).toHaveBeenCalled();
  });

  it("shows mock label when mock mode enabled", () => {
    const spy = vi.spyOn(apiClient, "getMarketStatus").mockResolvedValue({
      session: "regular",
      nextOpen: null,
      nextClose: null,
      source: "massive",
    });

    render(<SessionIndicator mock />);
    const indicator = screen.getByLabelText("session-indicator");
    expect(indicator.textContent?.replace(/\s+/g, "")).toContain("Session:Mock");
    expect(spy).not.toHaveBeenCalled();
  });
});
