const STORAGE_KEY = "ft_user_id";

function genId(): string {
  const cryptoApi =
    typeof globalThis !== "undefined" && "crypto" in globalThis
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `${Math.random().toString(36).slice(2)}${Date.now()}`;
}

function readStoredId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore storage failures */
  }
}

export function getUserId(): string {
  const envId = import.meta.env.VITE_DEMO_USER_ID?.trim();
  if (envId) {
    return envId;
  }

  const existing = readStoredId();
  if (existing) {
    return existing;
  }

  const id = genId();
  writeStoredId(id);
  return id;
}
