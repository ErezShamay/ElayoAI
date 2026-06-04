import { ELAYOAI_FIELD_REPORTS_OFFLINE_UI_DISMISS_PREFIX } from "@/lib/elayoai/keys";

const STORAGE_PREFIX = ELAYOAI_FIELD_REPORTS_OFFLINE_UI_DISMISS_PREFIX;

export type OfflinePrepUiDismissKind = "guide";

export type OfflinePrepUiDismissRecord = {
  expiresAt: string | null;
  catalogVersion: string | null;
};

export type OfflinePrepUiFingerprint = OfflinePrepUiDismissRecord;

function storageKey(organizationId: string, kind: OfflinePrepUiDismissKind) {
  return `${STORAGE_PREFIX}:${kind}:${organizationId}`;
}

function fingerprintMatches(
  stored: OfflinePrepUiDismissRecord | null,
  current: OfflinePrepUiFingerprint
): boolean {
  if (!stored) {
    return false;
  }

  return (
    stored.expiresAt === current.expiresAt
    && stored.catalogVersion === current.catalogVersion
  );
}

export function readOfflinePrepUiDismiss(
  organizationId: string,
  kind: OfflinePrepUiDismissKind
): OfflinePrepUiDismissRecord | null {
  if (!organizationId || typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(storageKey(organizationId, kind));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OfflinePrepUiDismissRecord;
  } catch {
    return null;
  }
}

export function saveOfflinePrepUiDismiss(
  organizationId: string,
  kind: OfflinePrepUiDismissKind,
  fingerprint: OfflinePrepUiFingerprint
) {
  if (!organizationId || typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    storageKey(organizationId, kind),
    JSON.stringify(fingerprint)
  );
}

export function clearOfflinePrepUiDismiss(organizationId: string) {
  if (!organizationId || typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(storageKey(organizationId, "guide"));
}

export function isOfflinePrepUiDismissed(
  organizationId: string,
  kind: OfflinePrepUiDismissKind,
  current: OfflinePrepUiFingerprint
): boolean {
  return fingerprintMatches(
    readOfflinePrepUiDismiss(organizationId, kind),
    current
  );
}
