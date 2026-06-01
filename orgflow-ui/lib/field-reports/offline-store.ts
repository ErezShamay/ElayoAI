const STORAGE_PREFIX = "orgflow-field-reports-offline";

export type OfflinePrepBundle = {
  organization_id: string;
  offline_max_days: number;
  prepared_at: string;
  expires_at: string;
  catalog_version?: string | null;
  catalog: unknown;
  visit_types: unknown[];
  organization_profile: unknown;
  projects: unknown[];
  reports: unknown[];
};

function storageKey(organizationId: string) {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

export function saveOfflinePrepBundle(
  organizationId: string,
  bundle: Omit<OfflinePrepBundle, "prepared_at" | "expires_at">
) {
  const preparedAt = new Date();
  const expiresAt = new Date(preparedAt);
  expiresAt.setDate(
    expiresAt.getDate() + (bundle.offline_max_days || 7)
  );

  const payload: OfflinePrepBundle = {
    ...bundle,
    prepared_at: preparedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  localStorage.setItem(
    storageKey(organizationId),
    JSON.stringify(payload)
  );

  return payload;
}

export function loadOfflinePrepBundle(
  organizationId: string
): OfflinePrepBundle | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(storageKey(organizationId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OfflinePrepBundle;
  } catch {
    return null;
  }
}

export function isOfflinePrepValid(
  bundle: OfflinePrepBundle | null
): boolean {
  if (!bundle?.expires_at) {
    return false;
  }

  return new Date(bundle.expires_at).getTime() > Date.now();
}

export function clearOfflinePrepBundle(organizationId: string) {
  localStorage.removeItem(storageKey(organizationId));
}
