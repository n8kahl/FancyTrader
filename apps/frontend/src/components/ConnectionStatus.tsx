import React from "react";
import { useConnectionStatus } from "../hooks";
import type { ConnectionStatus as ConnState } from "../hooks/useBackendConnection";

type Props = {
  state?: ConnState;
  reason?: string | null;
  isLoading?: boolean;
  isConnected?: boolean;
  error?: string | null;
  onReconnect?: () => void;
};

export function ConnectionStatus(props: Props) {
  const hook = useConnectionStatus();

  const isConnected = props.isConnected ?? hook.isConnected;
  const isLoading = props.isLoading ?? hook.isLoading;
  const error = props.error ?? hook.error;
  const connectionStatus = props.state ?? hook.connectionStatus;
  const connectionReason = props.reason ?? hook.connectionReason;
  const manualReconnect = props.onReconnect ?? hook.manualReconnect;

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
