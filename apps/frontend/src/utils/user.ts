export function getDefaultUserId(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("fancy-user-id");
    if (stored) {
      return stored;
    }
  }
  return import.meta.env.VITE_DEMO_USER_ID || "demo-user";
}
