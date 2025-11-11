import { useBackendConnection } from "./useBackendConnection";

export function useConnectionStatus() {
  const { isConnected, isLoading, error, connectionStatus, connectionReason, manualReconnect } =
    useBackendConnection();

  return {
    isConnected,
    isLoading,
    error,
    connectionStatus,
    connectionReason,
    manualReconnect,
  };
}
