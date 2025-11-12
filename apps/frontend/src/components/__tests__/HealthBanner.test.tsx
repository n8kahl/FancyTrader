import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HealthBanner } from "../HealthBanner";

describe("HealthBanner", () => {
  it("renders Connected when healthy", () => {
    render(<HealthBanner status="healthy" phase="regular" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it("renders Offline with reason and retry", () => {
    const onRetry = vi.fn();
    render(<HealthBanner status="down" reason="Provider limit" onRetry={onRetry} />);
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider limit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Try again/i));
    expect(onRetry).toHaveBeenCalled();
  });

  it("hides when hidden", () => {
    const { container } = render(<HealthBanner hidden />);
    expect(container.firstChild).toBeNull();
  });
});
