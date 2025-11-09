import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConnectionStatus } from "../../components/ConnectionStatus";

describe("ConnectionStatus", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Healthy label", () => {
    render(<ConnectionStatus state="healthy" />);
    expect(screen.getByTestId("connection-status-banner")).toBeInTheDocument();
    expect(screen.getByText(/Healthy/i)).toBeInTheDocument();
  });

  it("shows reason and reconnect button when offline", () => {
    const onRetry = vi.fn();
    render(<ConnectionStatus state="offline" reason="Polygon limit" onRetry={onRetry} />);
    expect(screen.getByText(/Polygon limit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides when banner disabled", () => {
    const original = import.meta.env.VITE_STATUS_BANNER;
    import.meta.env.VITE_STATUS_BANNER = "0";
    const { container } = render(<ConnectionStatus state="connecting" />);
    expect(container.firstChild).toBeNull();
    import.meta.env.VITE_STATUS_BANNER = original;
  });
});
