import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiClient,
  type ChartAnnotation,
  type ChartAnnotationDraft,
  type ChartAnnotationPatch,
  type ChartAnnotationInput,
} from "../services/apiClient";
import { logger } from "../utils/logger";

export interface UseAnnotationsResult {
  items: ChartAnnotation[];
  isLoading: boolean;
  error: string | null;
  add: (draft: ChartAnnotationDraft) => Promise<ChartAnnotation | null>;
  update: (id: string, patch: ChartAnnotationPatch) => Promise<ChartAnnotation | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const buildLocalAnnotation = (
  symbol: string,
  draft: ChartAnnotationDraft
): ChartAnnotation => {
  const localId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id: localId,
    symbol,
    entry: draft.entry,
    stop: draft.stop ?? null,
    targets: draft.targets ?? [],
    notes: draft.notes ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export function useAnnotations(
  symbol: string,
  userId?: string | null
): UseAnnotationsResult {
  const [items, setItems] = useState<ChartAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedSymbol = useMemo(() => symbol?.toUpperCase().trim(), [symbol]);
  const normalizedUser = useMemo(() => userId?.trim() || null, [userId]);

  const refresh = useCallback(async () => {
    if (!normalizedSymbol || !normalizedUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiClient.listChartAnnotations(normalizedSymbol, normalizedUser);
      setItems(data);
      setError(null);
    } catch (err) {
      logger.error("Failed to load chart annotations", err);
      setError(err instanceof Error ? err.message : "Failed to load annotations");
    } finally {
      setIsLoading(false);
    }
  }, [normalizedSymbol, normalizedUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (draft: ChartAnnotationDraft): Promise<ChartAnnotation | null> => {
      if (!normalizedSymbol) {
        return null;
      }
      try {
        if (!normalizedUser) {
          const local = buildLocalAnnotation(normalizedSymbol, draft);
          setItems((prev) => [local, ...prev]);
          return local;
        }
        const payload: ChartAnnotationInput = {
          symbol: normalizedSymbol,
          entry: draft.entry,
          stop: draft.stop ?? null,
          targets: draft.targets ?? [],
          notes: draft.notes ?? null,
        };
        const created = await apiClient.createChartAnnotation(normalizedUser, payload);
        setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
        return created;
      } catch (err) {
        logger.error("Failed to create annotation", err);
        setError(err instanceof Error ? err.message : "Failed to save annotation");
        throw err;
      }
    },
    [normalizedSymbol, normalizedUser]
  );

  const update = useCallback(
    async (id: string, patch: ChartAnnotationPatch): Promise<ChartAnnotation | null> => {
      if (!normalizedSymbol) return null;
      try {
        if (!normalizedUser) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...patch,
                    targets: patch.targets ?? item.targets,
                    stop:
                      patch.stop !== undefined
                        ? patch.stop ?? null
                        : item.stop,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );
          return items.find((item) => item.id === id) ?? null;
        }
        const updated = await apiClient.updateChartAnnotation(normalizedUser, id, patch);
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        return updated;
      } catch (err) {
        logger.error("Failed to update annotation", err);
        setError(err instanceof Error ? err.message : "Failed to update annotation");
        throw err;
      }
    },
    [items, normalizedSymbol, normalizedUser]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!normalizedSymbol) return false;
      try {
        if (!normalizedUser) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          return true;
        }
        await apiClient.deleteChartAnnotation(normalizedUser, id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      } catch (err) {
        logger.error("Failed to delete annotation", err);
        setError(err instanceof Error ? err.message : "Failed to delete annotation");
        throw err;
      }
    },
    [normalizedSymbol, normalizedUser]
  );

  return {
    items,
    isLoading,
    error,
    add,
    update,
    remove,
    refresh,
  };
}
