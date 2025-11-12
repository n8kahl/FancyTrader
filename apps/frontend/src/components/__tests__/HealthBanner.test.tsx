import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HealthBanner from "../HealthBanner";
import * as readyzHook from "../../hooks/useReadyz";
import * as sessionHook from "../../hooks/useSession";
import * as mockHook from "../../hooks/useMockMode";

describe("HealthBanner", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const readyzDown = {
    status: "down" as const,
    reason: "test failure",
    lastChecked: Date.now(),
  };

  const readyzUnknown = {
    status: "unknown" as const,
    lastChecked: Date.now(),
  };

  const defaultSession = { phase: "regular" as const };

  it("hides banner when mock mode is enabled", () => {
    vi.spyOn(mockHook, "useMockMode").mockReturnValue(true);
    vi.spyOn(sessionHook, "useSession").mockReturnValue(defaultSession);
    vi.spyOn(readyzHook, "useReadyz").mockReturnValue(readyzDown);

    render(<HealthBanner apiBase="" />);
    expect(screen.queryByText(/Stream: Down/i)).not.toBeInTheDocument();
  });

  it("hides banner when session is closed", () => {
    vi.spyOn(mockHook, "useMockMode").mockReturnValue(false);
    vi.spyOn(sessionHook, "useSession").mockReturnValue({ phase: "closed" });
    vi.spyOn(readyzHook, "useReadyz").mockReturnValue(readyzDown);

    render(<HealthBanner apiBase="" />);
    expect(screen.queryByText(/Stream: Down/i)).not.toBeInTheDocument();
  });

  it("never shows when status unknown", () => {
    vi.spyOn(mockHook, "useMockMode").mockReturnValue(false);
    vi.spyOn(sessionHook, "useSession").mockReturnValue(defaultSession);
    vi.spyOn(readyzHook, "useReadyz").mockReturnValue(readyzUnknown);

    render(<HealthBanner apiBase="" />);
    expect(screen.queryByText(/Stream: Down/i)).not.toBeInTheDocument();
  });

  it("shows when down and session active", () => {
    vi.spyOn(mockHook, "useMockMode").mockReturnValue(false);
    vi.spyOn(sessionHook, "useSession").mockReturnValue(defaultSession);
    vi.spyOn(readyzHook, "useReadyz").mockReturnValue(readyzDown);

    render(<HealthBanner apiBase="" />);
    expect(screen.getByText(/Stream: Down/i)).toBeInTheDocument();
  });
});
