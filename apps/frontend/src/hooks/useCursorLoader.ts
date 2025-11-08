import { useReducer, useCallback } from "react";
import { userMessage } from "../utils/errors";

interface CursorState<T> {
  items: T[];
  nextCursor?: string;
  loading: boolean;
  error?: string;
}

type CursorAction<T> =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: { items: T[]; nextCursor?: string } }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "RESET" };

const initialState = <T>(): CursorState<T> => ({
  items: [],
  nextCursor: undefined,
  loading: false,
  error: undefined,
});

function reducer<T>(state: CursorState<T>, action: CursorAction<T>): CursorState<T> {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: undefined };
    case "FETCH_SUCCESS":
      return {
        loading: false,
        error: undefined,
        items: [...state.items, ...action.payload.items],
        nextCursor: action.payload.nextCursor,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "RESET":
      return initialState<T>();
    default:
      return state;
  }
}

async function fetchPage<T>(url: string): Promise<{ items: T[]; nextCursor?: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as { items: T[]; nextCursor?: string };
}

export function useCursorLoader<T>(initialUrl: string) {
  const [state, dispatch] = useReducer(reducer<T>, undefined, initialState);

  const buildUrl = useCallback(
    (cursor?: string) => {
      const url = new URL(initialUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      } else {
        url.searchParams.delete("cursor");
      }
      return url.toString();
    },
    [initialUrl]
  );

  const loadMore = useCallback(async () => {
    if (state.loading) return;
    dispatch({ type: "FETCH_START" });
    try {
      const page = await fetchPage<T>(buildUrl(state.nextCursor));
      dispatch({ type: "FETCH_SUCCESS", payload: page });
    } catch (error) {
      dispatch({ type: "FETCH_ERROR", error: userMessage(error) });
    }
  }, [state.loading, state.nextCursor, buildUrl]);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    nextCursor: state.nextCursor,
    loadMore,
    reset,
  };
}
