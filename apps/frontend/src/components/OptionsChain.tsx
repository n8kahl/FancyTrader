import { useEffect, useMemo, useState } from "react";
import type { OptionsContract } from "@/types/trade";

type OptionTypeFilter = "ALL" | "CALL" | "PUT";
type MoneynessFilter = "ALL" | "ITM" | "OTM";

interface OptionsChainProps {
  contracts: OptionsContract[];
  pageSize?: number;
}

export function OptionsChain({ contracts, pageSize = 6 }: OptionsChainProps) {
  const [typeFilter, setTypeFilter] = useState<OptionTypeFilter>("ALL");
  const [moneynessFilter, setMoneynessFilter] = useState<MoneynessFilter>("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, moneynessFilter]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesType = typeFilter === "ALL" ? true : contract.type === typeFilter;
      const matchesMoneyness =
        moneynessFilter === "ALL" ? true : moneynessFilter === "ITM" ? contract.isITM : !contract.isITM;
      return matchesType && matchesMoneyness;
    });
  }, [contracts, typeFilter, moneynessFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const currentPageRows = filteredContracts.slice(startIndex, startIndex + pageSize);

  const goToPrevious = () => setPage((prev) => Math.max(1, prev - 1));
  const goToNext = () => setPage((prev) => Math.min(totalPages, prev + 1));

  return (
    <div className="space-y-4" aria-label="options-chain">
      <div className="flex flex-wrap gap-2" role="group" aria-label="option-type-filter">
        {(
          [
            { label: "All", value: "ALL" },
            { label: "Calls", value: "CALL" },
            { label: "Puts", value: "PUT" },
          ] as const
        ).map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`px-3 py-1 rounded border text-sm ${typeFilter === value ? "bg-primary/10" : "bg-muted"}`}
            aria-pressed={typeFilter === value}
            onClick={() => setTypeFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="moneyness-filter">
        {(
          [
            { label: "All", value: "ALL" },
            { label: "ITM", value: "ITM" },
            { label: "OTM", value: "OTM" },
          ] as const
        ).map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`px-3 py-1 rounded border text-sm ${moneynessFilter === value ? "bg-primary/10" : "bg-muted"}`}
            aria-pressed={moneynessFilter === value}
            onClick={() => setMoneynessFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th scope="col" className="px-3 py-2">Contract</th>
              <th scope="col" className="px-3 py-2">Type</th>
              <th scope="col" className="px-3 py-2">Strike</th>
              <th scope="col" className="px-3 py-2">Expiration</th>
              <th scope="col" className="px-3 py-2">Delta</th>
              <th scope="col" className="px-3 py-2">Premium</th>
            </tr>
          </thead>
          <tbody>
            {currentPageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No contracts match the selected filters.
                </td>
              </tr>
            ) : (
              currentPageRows.map((contract) => (
                <tr key={contract.symbol} data-testid="chain-row" className="border-t">
                  <td className="px-3 py-2 font-mono">{contract.symbol}</td>
                  <td className="px-3 py-2">{contract.type}</td>
                  <td className="px-3 py-2">${contract.strike.toFixed(2)}</td>
                  <td className="px-3 py-2">{contract.expirationDisplay}</td>
                  <td className="px-3 py-2">{contract.delta !== undefined ? contract.delta.toFixed(2) : "--"}</td>
                  <td className="px-3 py-2">${contract.premium.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3" aria-label="pagination">
        <button type="button" onClick={goToPrevious} disabled={page === 1}>
          Previous
        </button>
        <span data-testid="page-indicator">
          Page {page} of {totalPages}
        </span>
        <button type="button" onClick={goToNext} disabled={page === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
