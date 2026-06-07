export const WORKSPACE_CACHE_TTL_MS = 60_000;

export type WorkspaceCacheSnapshot = {
  project: {
    id: string;
    project_name: string;
    developer_name?: string | null;
    contractor_name?: string | null;
    lawyer_name?: string | null;
    supervisor_name: string;
    supervisor_email?: string | null;
    developer_pm_name?: string | null;
    accompanying_lawyer?: string | null;
    architect_name?: string | null;
    site_manager_name?: string | null;
    city?: string | null;
    housing_units_count?: number | null;
    status: string;
    created_at: string;
  } | null;
  reviews: unknown[];
  actions: unknown[];
  exceptions: unknown[];
  activities: unknown[];
  insights: unknown[];
  summary: {
    reviews_count: number;
    actions_count: number;
    escalations_count: number;
    reports_count: number;
  };
  health: {
    score: number;
    status: string;
  };
  fetchedAt: number;
};

const store = new Map<string, WorkspaceCacheSnapshot>();

export function readWorkspaceCache(
  projectId: string,
  ttlMs = WORKSPACE_CACHE_TTL_MS
): WorkspaceCacheSnapshot | null {
  const entry = store.get(projectId);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.fetchedAt > ttlMs) {
    store.delete(projectId);
    return null;
  }

  return entry;
}

export function writeWorkspaceCache(
  projectId: string,
  snapshot: Omit<WorkspaceCacheSnapshot, "fetchedAt">
) {
  store.set(projectId, {
    ...snapshot,
    fetchedAt: Date.now(),
  });
}

export function invalidateWorkspaceCache(projectId?: string) {
  if (projectId) {
    store.delete(projectId);
    return;
  }

  store.clear();
}
