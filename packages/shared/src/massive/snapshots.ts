// Minimal helper to get a per-symbol snapshot using the shared client.
// Adjust the import path if your client file is located elsewhere.

type SnapshotProvider = {
  getSnapshot?: (symbol: string) => Promise<unknown>;
  getQuote?: (symbol: string) => Promise<unknown>;
};

export async function getSnapshotForSymbol(provider: SnapshotProvider, symbol: string): Promise<unknown> {
  if (typeof provider.getSnapshot === "function") {
    return provider.getSnapshot(symbol);
  }
  if (typeof provider.getQuote === "function") {
    return provider.getQuote(symbol);
  }
  throw new Error("Snapshot client lacks both getSnapshot and getQuote");
}
