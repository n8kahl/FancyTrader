import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionsChain } from "../components/OptionsChain";
import type { OptionsContract } from "@/types/trade";

const sampleContracts: OptionsContract[] = [
  {
    symbol: "C1",
    type: "CALL",
    strike: 400,
    expiration: "2025-01-17",
    expirationDisplay: "Jan 17",
    daysToExpiry: 120,
    premium: 5,
    delta: 0.65,
    breakEven: 405,
    isITM: true,
    distanceFromPrice: 2,
  },
  {
    symbol: "C2",
    type: "CALL",
    strike: 410,
    expiration: "2025-01-17",
    expirationDisplay: "Jan 17",
    daysToExpiry: 120,
    premium: 3,
    delta: 0.45,
    breakEven: 413,
    isITM: false,
    distanceFromPrice: 12,
  },
  {
    symbol: "P1",
    type: "PUT",
    strike: 395,
    expiration: "2025-01-17",
    expirationDisplay: "Jan 17",
    daysToExpiry: 120,
    premium: 2.5,
    delta: -0.35,
    breakEven: 392.5,
    isITM: false,
    distanceFromPrice: -5,
  },
];

const getVisibleSymbols = () => {
  const containers = screen.getAllByLabelText("options-chain");
  const scope = containers[containers.length - 1];
  return Array.from(
    new Set(
      within(scope)
        .queryAllByTestId("chain-row")
        .map((row) => within(row).getAllByRole("cell")[0]?.textContent?.trim())
        .filter((symbol): symbol is string => Boolean(symbol))
    )
  );
};

describe("OptionsChain", () => {
  it("paginates rows and advances between pages", async () => {
    render(<OptionsChain contracts={sampleContracts} pageSize={2} />);

    expect(getVisibleSymbols()).toEqual(["C1", "C2"]);
    expect(screen.getByTestId("page-indicator")).toHaveTextContent("Page 1 of 2");

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(getVisibleSymbols()).toEqual(["P1"]);
      expect(screen.getByTestId("page-indicator")).toHaveTextContent("Page 2 of 2");
    });
  });

  it("filters contracts by type and moneyness", async () => {
    render(<OptionsChain contracts={sampleContracts} pageSize={10} />);

    const typeFilterGroups = screen.getAllByRole("group", { name: /option-type-filter/i });
    const typeFilterGroup = typeFilterGroups[typeFilterGroups.length - 1];
    await userEvent.click(within(typeFilterGroup).getByRole("button", { name: /calls/i }));
    await waitFor(() => expect(getVisibleSymbols()).toEqual(["C1", "C2"]));

    const moneynessGroups = screen.getAllByRole("group", { name: /moneyness-filter/i });
    const moneynessGroup = moneynessGroups[moneynessGroups.length - 1];
    await userEvent.click(within(moneynessGroup).getByRole("button", { name: /itm/i }));
    await waitFor(() => expect(getVisibleSymbols()).toEqual(["C1"]));
  });

  it("shows an empty state when filters remove all contracts", async () => {
    render(<OptionsChain contracts={sampleContracts} pageSize={5} />);

    const typeFilterGroups = screen.getAllByRole("group", { name: /option-type-filter/i });
    const typeFilterGroup = typeFilterGroups[typeFilterGroups.length - 1];
    const moneynessGroups = screen.getAllByRole("group", { name: /moneyness-filter/i });
    const moneynessGroup = moneynessGroups[moneynessGroups.length - 1];

    await userEvent.click(within(typeFilterGroup).getByRole("button", { name: /puts/i }));
    await userEvent.click(within(moneynessGroup).getByRole("button", { name: /itm/i }));

    await waitFor(() => expect(getVisibleSymbols()).toEqual([]));
    expect(screen.getByText(/no contracts match/i)).toBeInTheDocument();
  });
});
