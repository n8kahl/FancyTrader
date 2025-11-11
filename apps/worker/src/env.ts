import { serverEnv } from "@fancytrader/shared/server";

function buildMassiveSocketUrl(base: string, cluster: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedCluster = cluster.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedCluster}`;
}

export const workerEnv = {
  MASSIVE_BASE_URL: serverEnv.MASSIVE_BASE_URL,
  MASSIVE_WS_BASE: serverEnv.MASSIVE_WS_BASE,
  MASSIVE_WS_CLUSTER: serverEnv.MASSIVE_WS_CLUSTER,
  MASSIVE_SOCKET_URL: buildMassiveSocketUrl(
    serverEnv.MASSIVE_WS_BASE,
    serverEnv.MASSIVE_WS_CLUSTER
  ),
  MASSIVE_API_KEY: serverEnv.MASSIVE_API_KEY ?? "",
  WORKER_SYMBOLS: (process.env.WORKER_SYMBOLS || "SPY,QQQ")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  WORKER_METRICS_PORT: Number(process.env.WORKER_METRICS_PORT || 0),
};

// fail early if required values are missing
export function assertWorkerEnv(): void {
  if (!workerEnv.MASSIVE_API_KEY) {
    throw new Error("MASSIVE_API_KEY is required for the worker. Set it in your environment.");
  }
}
