const STORAGE_PREFIX = "orgflow-field-reports-send-queue";

export type PendingSendSyncPhase =
  | "queued"
  | "metadata"
  | "photos"
  | "pdf"
  | "request_send";

export type PendingSendRequest = {
  reportId: string;
  organizationId: string;
  requestedAt: string;
  syncPhase?: PendingSendSyncPhase;
  lastError?: string;
};

function storageKey(organizationId: string) {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

export function loadPendingSendRequests(
  organizationId: string
): PendingSendRequest[] {
  if (typeof window === "undefined" || !organizationId) {
    return [];
  }

  const raw = localStorage.getItem(storageKey(organizationId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PendingSendRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isReportPendingSendLocally(
  organizationId: string,
  reportId: string
): boolean {
  return loadPendingSendRequests(organizationId).some(
    (entry) => entry.reportId === reportId
  );
}

export function enqueuePendingSendRequest(
  organizationId: string,
  reportId: string
): PendingSendRequest {
  const existing = loadPendingSendRequests(organizationId).filter(
    (entry) => entry.reportId !== reportId
  );
  const request: PendingSendRequest = {
    reportId,
    organizationId,
    requestedAt: new Date().toISOString(),
    syncPhase: "queued",
  };

  localStorage.setItem(
    storageKey(organizationId),
    JSON.stringify([...existing, request])
  );

  return request;
}

export function updatePendingSendRequest(
  organizationId: string,
  reportId: string,
  patch: Partial<Pick<PendingSendRequest, "syncPhase" | "lastError">>
) {
  const requests = loadPendingSendRequests(organizationId);
  const index = requests.findIndex((entry) => entry.reportId === reportId);

  if (index === -1) {
    return null;
  }

  const updated = { ...requests[index], ...patch };
  requests[index] = updated;
  localStorage.setItem(storageKey(organizationId), JSON.stringify(requests));
  return updated;
}

export function removePendingSendRequest(
  organizationId: string,
  reportId: string
) {
  const remaining = loadPendingSendRequests(organizationId).filter(
    (entry) => entry.reportId !== reportId
  );

  if (remaining.length) {
    localStorage.setItem(
      storageKey(organizationId),
      JSON.stringify(remaining)
    );
  } else {
    localStorage.removeItem(storageKey(organizationId));
  }
}

export function pendingSendPhaseLabelHe(
  phase?: PendingSendSyncPhase
): string {
  switch (phase) {
    case "metadata":
      return "מסנכרן פרטי דוח...";
    case "photos":
      return "מעלה תמונות...";
    case "pdf":
      return "מאמת PDF...";
    case "request_send":
      return "שולח לליבה...";
    case "queued":
    default:
      return "ממתין לסנכרון";
  }
}
