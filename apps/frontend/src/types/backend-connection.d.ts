export interface BackendConnection {
  isConnected: boolean;
  isLoading: boolean;
  error?: string | null;

  trades: any[];

  subscribeToSymbols(symbols: string[]): void;
  unsubscribeFromSymbols(symbols: string[]): void;

  connectionStatus: string;
  connectionReason?: string | null;

  manualReconnect(): void;
}

declare module "../hooks/useBackendConnection" {
  export function useBackendConnection(): BackendConnection;
}
