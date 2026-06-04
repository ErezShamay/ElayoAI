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
  queryCacheKey,
  readQueryCache,
  writeQueryCache,
} from "@/lib/ui/query-cache";
import { showToast } from "@/lib/ui/toast";

export type AsyncDataState<T> = {
  data: T | null;
  loading: boolean;
  isValidating: boolean;
  error: Error | null;
  retryCount: number;
};

export function useAsyncData<T>(
  loader: () => Promise<T>,
  options?: {
    enabled?: boolean;
    showErrorToast?: boolean;
    errorMessage?: string;
    cacheKey?: string;
    ttlMs?: number;
  }
) {
  const { currentOrgId, loading: authLoading } = useAuth();
  const enabled = options?.enabled ?? true;
  const errorMessage = options?.errorMessage;
  const showErrorToast = options?.showErrorToast;
  const loaderRef = useRef(loader);
  const storageKey = options?.cacheKey
    ? queryCacheKey(currentOrgId, options.cacheKey)
    : null;
  const cachedInitial = storageKey
    ? readQueryCache<T>(storageKey, options?.ttlMs)
    : null;

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const [state, setState] = useState<AsyncDataState<T>>({
    data: cachedInitial,
    loading: enabled && !cachedInitial,
    isValidating: false,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: current.data === null,
      isValidating: current.data !== null,
      error: null,
    }));

    try {
      const data = await loaderRef.current();

      if (storageKey) {
        writeQueryCache(storageKey, currentOrgId, data);
      }

      setState((current) => ({
        ...current,
        data,
        loading: false,
        isValidating: false,
        error: null,
      }));

      return data;
    } catch (error) {
      const normalized =
        error instanceof Error
          ? error
          : new Error(String(error));

      setState((current) => ({
        ...current,
        loading: false,
        isValidating: false,
        error: normalized,
      }));

      if (showErrorToast) {
        showToast(
          errorMessage ?? normalized.message,
          "error"
        );
      }

      throw normalized;
    }
  }, [currentOrgId, errorMessage, showErrorToast, storageKey]);

  const retry = useCallback(async () => {
    setState((current) => ({
      ...current,
      retryCount: current.retryCount + 1,
    }));

    return execute();
  }, [execute]);

  useEffect(() => {
    if (!enabled || authLoading) {
      return;
    }

    if (storageKey) {
      const cached = readQueryCache<T>(storageKey, options?.ttlMs);

      if (cached) {
        setState((current) => ({
          ...current,
          data: cached,
          loading: false,
        }));
      }
    }

    startTransition(() => {
      void execute().catch(() => undefined);
    });
  }, [
    authLoading,
    enabled,
    execute,
    options?.ttlMs,
    state.retryCount,
    storageKey,
  ]);

  return {
    ...state,
    reload: execute,
    retry,
  };
}
