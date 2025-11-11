import React from "react";
import { useConnectionStatus } from "../hooks";

export function ConnectionStatus() {
  const { isConnected, isLoading, error, connectionStatus, connectionReason, manualReconnect } =
    useConnectionStatus();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium">Status:</span>
      <span>{connectionStatus}</span>
      {connectionReason ? <span className="text-zinc-500">– {connectionReason}</span> : null}
      {isLoading ? <span className="text-zinc-500">(connecting)</span> : null}
      {!isLoading && !isConnected ? (
        <button
          className="ml-2 rounded px-2 py-1 border border-zinc-300 hover:bg-zinc-100"
          onClick={manualReconnect}
        >
          Reconnect
        </button>
      ) : null}
      {error ? <span className="ml-2 text-red-600">Error: {error}</span> : null}
    </div>
  );
}

export default ConnectionStatus;
