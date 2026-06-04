export type FieldReportModuleStatusCache = {
  organization_id: string;
  is_enabled: boolean;
  storage_available?: boolean;
  cached_at: string;
};

const STORAGE_KEY_PREFIX = "elayoai-field-reports-module-status:";

function storageKey(organizationId: string): string {
  return `${STORAGE_KEY_PREFIX}${organizationId}`;
}

export function readCachedFieldReportModuleStatus(
  organizationId: string
): FieldReportModuleStatusCache | null {
  if (!organizationId || typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(storageKey(organizationId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as FieldReportModuleStatusCache;
    if (
      parsed.organization_id !== organizationId
      || typeof parsed.is_enabled !== "boolean"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedFieldReportModuleStatus(status: {
  organization_id: string;
  is_enabled: boolean;
  storage_available?: boolean;
}): void {
  if (!status.organization_id || typeof localStorage === "undefined") {
    return;
  }

  const entry: FieldReportModuleStatusCache = {
    organization_id: status.organization_id,
    is_enabled: status.is_enabled,
    storage_available: status.storage_available,
    cached_at: new Date().toISOString(),
  };

  localStorage.setItem(
    storageKey(status.organization_id),
    JSON.stringify(entry)
  );
}

export function clearCachedFieldReportModuleStatus(
  organizationId: string
): void {
  if (!organizationId || typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(storageKey(organizationId));
}
