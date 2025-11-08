import type { BackendSetup } from "../services/apiClient";
import type { ConnectionState, WSMessage } from "../services/websocketClient";

type Unsubscribe = () => void;

type WsClientContract = {
  connect(): void;
  close(): void;
  disconnect(): void;
  manualReconnect?: () => void;
  subscribe(symbols: string[]): void;
  unsubscribe(symbols: string[]): void;
  resubscribeAll(): void;
  onMessage(handler: (message: WSMessage) => void): Unsubscribe;
  onStateChange(handler: (state: ConnectionState) => void): Unsubscribe;
  onError(handler: (error: unknown) => void): Unsubscribe;
  getConnectionState(): ConnectionState;
  getConnectionStatus(): boolean;
};

type ApiClientContract = {
  getSetups(): Promise<BackendSetup[]>;
  checkHealth(): Promise<{ ok: boolean; version?: string }>;
};

type ToastApi = {
  success(message: string, options?: Record<string, unknown>): void;
  error(message: string, options?: Record<string, unknown>): void;
  warning(message: string, options?: Record<string, unknown>): void;
};

type LoggerApi = {
  info(message: unknown, ...rest: unknown[]): void;
  warn(message: unknown, ...rest: unknown[]): void;
  error(message: unknown, ...rest: unknown[]): void;
  debug(message: unknown, ...rest: unknown[]): void;
};

export interface BackendConnectionDependencies {
  apiClient: ApiClientContract;
  wsClient: WsClientContract;
  toast: ToastApi;
  logger: LoggerApi;
}

let currentDeps: BackendConnectionDependencies | null = null;

export function setBackendConnectionDeps(deps: BackendConnectionDependencies): void {
  currentDeps = deps;
}

export function getBackendConnectionDeps(
  fallback?: BackendConnectionDependencies
): BackendConnectionDependencies {
  if (currentDeps) {
    return currentDeps;
  }

  if (fallback) {
    currentDeps = fallback;
    return currentDeps;
  }

  throw new Error("Backend connection dependencies have not been configured");
}
