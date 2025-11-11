export const workerEnv = {
  MASSIVE_SOCKET_URL:
    process.env.MASSIVE_SOCKET_URL || "wss://socket.massive.com/options",
  MASSIVE_API_KEY: process.env.MASSIVE_API_KEY ?? "",
  MASSIVE_BASE_URL: process.env.MASSIVE_BASE_URL || "https://api.massive.com",
};

// fail early if required values are missing
export function assertWorkerEnv() {
  if (!workerEnv.MASSIVE_API_KEY) {
    throw new Error(
      "MASSIVE_API_KEY is required for the worker. Set it in your environment."
    );
  }
}
