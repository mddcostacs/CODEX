"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { logSupabaseError } from "@/lib/services";

export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (err) {
      const normalized = logSupabaseError("[RecebeFlow] Falha ao carregar dados", err);
      setError(normalized.message || "Não foi possível carregar os dados agora.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
