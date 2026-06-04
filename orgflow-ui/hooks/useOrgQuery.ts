"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_QUERY_TTL_MS,
  queryCacheKey,
  readQueryCache,
  writeQueryCache,
} from "@/lib/ui/query-cache";

export type OrgQueryState<T> = {
  data: T | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | null;
  reload: () => Promise<T | undefined>;
};

export function useOrgQuery<T>(
  queryKey: string,
  loader: () => Promise<T>,
  options?: {
    enabled?: boolean;
    ttlMs?: number;
    showErrorToast?: boolean;
    errorMessage?: string;
  }
): OrgQueryState<T> {
  const {
    currentOrgId,
    loading: authLoading,
  } = useAuth();

  const enabled = options?.enabled ?? true;
  const ttlMs = options?.ttlMs ?? DEFAULT_QUERY_TTL_MS;
  const cacheKey = queryCacheKey(currentOrgId, queryKey);
  const loaderRef = useRef(loader);
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const cachedOnMount = readQueryCache<T>(cacheKey, ttlMs);

  const [data, setData] = useState<T | null>(cachedOnMount);
  const [loading, setLoading] = useState(
    enabled
    && !authLoading
    && Boolean(currentOrgId)
    && cachedOnMount === null
  );
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchData = useCallback(async () => {
    if (!enabled || authLoading) {
      return undefined;
    }

    if (!currentOrgId) {
      setData(null);
      dataRef.current = null;
      setLoading(false);
      setIsValidating(false);
      setError(null);
      return undefined;
    }

    const hasData = dataRef.current !== null;

    if (!hasData) {
      setLoading(true);
    } else {
      setIsValidating(true);
    }

    setError(null);

    try {
      const result = await loaderRef.current();
      setData(result);
      dataRef.current = result;
      writeQueryCache(cacheKey, currentOrgId, result);
      return result;
    } catch (caught) {
      const normalized =
        caught instanceof Error
          ? caught
          : new Error(String(caught));

      setError(normalized);

      if (options?.showErrorToast) {
        const { showToast } = await import("@/lib/ui/toast");
        showToast(
          options.errorMessage ?? normalized.message,
          "error"
        );
      }

      return undefined;
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  }, [
    authLoading,
    cacheKey,
    currentOrgId,
    enabled,
    options?.errorMessage,
    options?.showErrorToast,
  ]);

  useEffect(() => {
    if (!enabled || authLoading) {
      return;
    }

    if (!currentOrgId) {
      setData(null);
      dataRef.current = null;
      setLoading(false);
      setIsValidating(false);
      return;
    }

    const cached = readQueryCache<T>(cacheKey, ttlMs);

    if (cached) {
      setData(cached);
      dataRef.current = cached;
      setLoading(false);
    } else {
      setLoading(true);
    }

    startTransition(() => {
      void fetchData();
    });
  }, [
    authLoading,
    cacheKey,
    currentOrgId,
    enabled,
    fetchData,
    ttlMs,
  ]);

  const reload = useCallback(async () => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    isValidating,
    error,
    reload,
  };
}
