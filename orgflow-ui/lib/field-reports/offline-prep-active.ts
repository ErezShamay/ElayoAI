import { ELAYOAI_FIELD_REPORTS_OFFLINE_PREP_ACTIVE_PREFIX } from "@/lib/elayoai/keys";

export const OFFLINE_PREP_ACTIVE_CHANGED_EVENT =
  "field-report-offline-prep-active-changed";

function storageKey(organizationId: string) {
  return `${ELAYOAI_FIELD_REPORTS_OFFLINE_PREP_ACTIVE_PREFIX}:${organizationId}`;
}

export function readOfflinePrepActive(organizationId: string): boolean {
  if (!organizationId || typeof localStorage === "undefined") {
    return false;
  }

  return localStorage.getItem(storageKey(organizationId)) === "1";
}

export function setOfflinePrepActive(
  organizationId: string,
  active: boolean
) {
  if (!organizationId || typeof localStorage === "undefined") {
    return;
  }

  if (active) {
    localStorage.setItem(storageKey(organizationId), "1");
  } else {
    localStorage.removeItem(storageKey(organizationId));
  }

  notifyOfflinePrepActiveChanged();
}

export function clearOfflinePrepActive(organizationId: string) {
  setOfflinePrepActive(organizationId, false);
}

export function notifyOfflinePrepActiveChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(OFFLINE_PREP_ACTIVE_CHANGED_EVENT));
}
