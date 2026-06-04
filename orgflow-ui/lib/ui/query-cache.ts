type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
  orgId: string | null;
};

const store = new Map<string, CacheEntry<unknown>>();

export const DEFAULT_QUERY_TTL_MS = 30_000;

export function queryCacheKey(
  orgId: string | null,
  key: string
) {
  return `${orgId ?? "_"}:${key}`;
}

export function readQueryCache<T>(
  cacheKey: string,
  ttlMs = DEFAULT_QUERY_TTL_MS
): T | null {
  const entry = store.get(cacheKey);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.fetchedAt > ttlMs) {
    store.delete(cacheKey);
    return null;
  }

  return entry.data as T;
}

export function writeQueryCache<T>(
  cacheKey: string,
  orgId: string | null,
  data: T
) {
  store.set(cacheKey, {
    data,
    fetchedAt: Date.now(),
    orgId,
  });
}

export function invalidateQuery(cacheKey: string) {
  store.delete(cacheKey);
}

export function invalidateOrgQueries(orgId?: string | null) {
  if (orgId === undefined) {
    store.clear();
    return;
  }

  const prefix = `${orgId}:`;

  for (const key of store.keys()) {
    if (key === `${orgId}:_` || key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function clearQueryCache() {
  store.clear();
}
