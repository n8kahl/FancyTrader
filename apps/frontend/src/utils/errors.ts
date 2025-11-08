export function userMessage(err: unknown): string {
  if (isApiError(err)) {
    switch (err.code) {
      case "VALIDATION_ERROR":
        return "Some inputs look invalid. Check the form and try again.";
      case "RATE_LIMITED":
        return "Too many requests. Please wait a moment and retry.";
      case "UPSTREAM_ERROR":
        return "Upstream data provider returned an error. Try again shortly.";
      case "WATCHLIST_DUPLICATE":
        return "That symbol is already in your watchlist.";
      case "WATCHLIST_NOT_FOUND":
        return "We couldn't find that symbol on your watchlist.";
      case "NETWORK_ERROR":
        return "Cannot reach the backend. Check your connection and try again.";
      default:
        return err.message || "Unexpected error occurred.";
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Unexpected error occurred.";
}

function isApiError(error: unknown): error is { message: string; code?: string } {
  return typeof error === "object" && !!error && "message" in error;
}
