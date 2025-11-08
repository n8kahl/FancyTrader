import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SymbolChartWithAnnotations } from "../../components/SymbolChartWithAnnotations";
import * as annotationsHook from "../../hooks/useAnnotations";

describe("SymbolChartWithAnnotations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders and allows creating a placeholder annotation", () => {
    const mockHook = {
      items: [],
      isLoading: false,
      error: null,
      add: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      remove: vi.fn().mockResolvedValue(true),
      refresh: vi.fn(),
    };
    vi.spyOn(annotationsHook, "useAnnotations").mockReturnValue(mockHook as any);
    render(<SymbolChartWithAnnotations symbol="AAPL" userId="demo" />);
    const addButton = screen.getByRole("button", { name: /Add annotation/i });
    fireEvent.click(addButton);
    expect(mockHook.add).toHaveBeenCalled();
  });

  it("shows loading indicator when syncing", () => {
    vi.spyOn(annotationsHook, "useAnnotations").mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      refresh: vi.fn(),
    } as any);
    render(<SymbolChartWithAnnotations symbol="MSFT" userId="demo" />);
    expect(screen.getByText(/Syncing annotations/i)).toBeInTheDocument();
  });
});
