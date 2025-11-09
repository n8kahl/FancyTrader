import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SessionIndicator } from "../SessionIndicator";
import { apiClient } from "../../services/apiClient";

describe("SessionIndicator", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders and polls status", async () => {
    const getMarketStatus = vi
      .spyOn(apiClient, "getMarketStatus")
      .mockResolvedValue({
        session: "regular",
        nextOpen: null,
        nextClose: null,
        source: "backend",
      });

    render(<SessionIndicator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Session: Regular/i)).toBeInTheDocument();
    });
    expect(getMarketStatus).toHaveBeenCalled();
  });

  it("respects mock mode", () => {
    const getMarketStatus = vi
      .spyOn(apiClient, "getMarketStatus")
      .mockResolvedValue({
        session: "premarket",
        nextOpen: null,
        nextClose: null,
        source: "backend",
      });

    render(<SessionIndicator mock />);

    expect(screen.getByLabelText(/Session: Mock/i)).toBeInTheDocument();
    expect(getMarketStatus).not.toHaveBeenCalled();
  });
});
