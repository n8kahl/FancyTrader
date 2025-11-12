import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ConnectionStatus from "../../components/ConnectionStatus";

describe("ConnectionStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Connected label when healthy", () => {
    render(<ConnectionStatus state="healthy" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it("shows reason and retry when offline", () => {
    const onRetry = vi.fn();
    render(<ConnectionStatus state="offline" reason="Provider limit" onRetry={onRetry} />);
    expect(screen.getByText(/Provider limit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Try again/i));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
