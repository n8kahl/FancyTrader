import { forwardRef, type ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchlistManager } from "../components/WatchlistManager";
import type { WatchlistItem } from "@fancytrader/shared";

const mockApiClient = vi.hoisted(() => ({
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: mockApiClient,
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../components/ui/Toast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../components/ui/dialog", () => {
  const Passthrough = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  function MockDialog({ children }: { children: ReactNode; open?: boolean }) {
    return <div data-testid="dialog-root">{children}</div>;
  }
  MockDialog.displayName = "MockDialog";
  const DialogContent = forwardRef<HTMLDivElement, { children: ReactNode }>((props, ref) => (
    <div ref={ref}>{props.children}</div>
  ));
  DialogContent.displayName = "MockDialogContent";
  return {
    Dialog: MockDialog,
    DialogContent,
    DialogHeader: Passthrough,
    DialogTitle: Passthrough,
    DialogDescription: Passthrough,
  };
});

vi.mock("../components/ui/alert-dialog", () => {
  const Container = ({ children, open = false }: { children: ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null;
  const Passthrough = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const ButtonLike = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
  return {
    AlertDialog: Container,
    AlertDialogContent: Passthrough,
    AlertDialogHeader: Passthrough,
    AlertDialogTitle: Passthrough,
    AlertDialogDescription: Passthrough,
    AlertDialogFooter: Passthrough,
    AlertDialogCancel: ButtonLike,
    AlertDialogAction: ButtonLike,
  };
});


vi.mock("../components/ui/tabs", () => {
  const Tabs = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const TabsList = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const TabsTrigger = ({ children }: { children: ReactNode }) => <button type="button">{children}</button>;
  const TabsContent = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

type WatchlistEntry = WatchlistItem & {
  name: string;
  sector?: string;
  isActive: boolean;
  addedAt?: string;
};

interface RenderOverrides {
  onWatchlistChange?: (next: WatchlistEntry[]) => void;
}

const renderManager = (watchlist: WatchlistEntry[] = [], overrides: RenderOverrides = {}) => {
  const { onWatchlistChange = () => undefined } = overrides;
  return render(
    <WatchlistManager
      open
      onOpenChange={() => undefined}
      watchlist={watchlist}
      onWatchlistChange={onWatchlistChange}
    />
  );
};
const getSymbolInput = () => {
  const inputs = screen.getAllByTestId("watchlist-symbol-input");
  return inputs[inputs.length - 1] as HTMLInputElement;
};
const getAddButton = () => {
  const buttons = screen.getAllByTestId("watchlist-add-button");
  return buttons[buttons.length - 1];
};
const getClearInactiveTrigger = () => screen.getAllByRole(
  "button",
  { name: /clear inactive/i }
)[0];
const getClearInactiveConfirm = () => {
  const dialog = screen.getByTestId("alert-dialog");
  return within(dialog).getByRole("button", { name: /clear inactive/i });
};

describe("WatchlistManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically adds a symbol and calls the API", async () => {
    mockApiClient.addToWatchlist.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderManager([], { onWatchlistChange: vi.fn() });

    await user.type(getSymbolInput(), "TSLA");
    await user.click(getAddButton());

    await waitFor(() => expect(screen.getAllByText("TSLA").length).toBeGreaterThan(0));
    await waitFor(() => expect(mockApiClient.addToWatchlist).toHaveBeenCalledWith("TSLA"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("reverts the optimistic add when the API rejects", async () => {
    mockApiClient.addToWatchlist.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderManager([], { onWatchlistChange: vi.fn() });

    await user.type(getSymbolInput(), "FAIL");
    await user.click(getAddButton());

    await waitFor(() => expect(mockApiClient.addToWatchlist).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryAllByText("FAIL")).toHaveLength(0));
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("removes a symbol via optimistic update", async () => {
    mockApiClient.removeFromWatchlist.mockResolvedValueOnce({ ok: true });
    const onWatchlistChange = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderManager(
      [
        { symbol: "AAPL", name: "Apple", isActive: true },
      ],
      { onWatchlistChange }
    );

    await user.click(screen.getByLabelText(/remove AAPL/i));

    await waitFor(() => expect(screen.queryByLabelText(/remove AAPL/i)).not.toBeInTheDocument());
    expect(mockApiClient.removeFromWatchlist).toHaveBeenCalledWith("AAPL");
    expect(onWatchlistChange).toHaveBeenCalled();
  });

  it("validates symbol input before calling the API", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderManager([
      { symbol: "AAPL", name: "Apple", isActive: true },
    ]);

    await user.click(getAddButton());
    expect(await screen.findByText(/symbol is required/i)).toBeInTheDocument();

    await user.type(getSymbolInput(), "invalid1");
    await user.click(getAddButton());
    expect(await screen.findByText(/must be 1-5 characters/i)).toBeInTheDocument();

    await user.clear(getSymbolInput());
    await user.type(getSymbolInput(), "AAPL");
    await user.click(getAddButton());
    expect(await screen.findByText(/already in watchlist/i)).toBeInTheDocument();
    expect(mockApiClient.addToWatchlist).not.toHaveBeenCalled();
  });

  it("supports quick add and bulk actions", async () => {
    mockApiClient.addToWatchlist.mockResolvedValue({ ok: true });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onWatchlistChange = vi.fn();

    renderManager([
      { symbol: "AAPL", name: "Apple", isActive: false },
    ], { onWatchlistChange });

    const quickAddButton = screen
      .getAllByRole("button", { name: "SPY" })
      .find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(quickAddButton);
    await waitFor(() => expect(mockApiClient.addToWatchlist).toHaveBeenCalledWith("SPY"));
    await screen.findByLabelText(/remove SPY/i);

    await user.click(screen.getAllByRole("button", { name: /activate all/i })[0]);
    await user.click(screen.getAllByRole("button", { name: /deactivate all/i })[0]);
    await user.click(getClearInactiveTrigger());
    await screen.findByTestId("alert-dialog");
    await user.click(getClearInactiveConfirm());

    await waitFor(() => expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(mockToast.success.mock.calls.some(([message]) => message.includes("Removed"))).toBe(true)
    );
  });
});
