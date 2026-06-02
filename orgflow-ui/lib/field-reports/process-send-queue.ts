import { apiFetch } from "@/lib/api/client";
import { hasVisitReportPdfLocally } from "@/lib/field-reports/pdf/visit-report-pdf-store";
import { flushReportMetadataDraft } from "@/lib/field-reports/report-metadata-draft";
import {
  loadPendingSendRequests,
  removePendingSendRequest,
  updatePendingSendRequest,
  type PendingSendRequest,
  type PendingSendSyncPhase,
} from "@/lib/field-reports/send-queue";
import { syncPendingLinePhotosForReport } from "@/lib/field-reports/sync-pending-line-photos";

export type SendQueueItemResult = {
  reportId: string;
  success: boolean;
  error?: string;
};

export type ProcessSendQueueResult = {
  processed: SendQueueItemResult[];
};

async function requestSendToCore(reportId: string) {
  const response = await apiFetch(
    `/field-reports/visits/${reportId}/request-send`,
    { method: "POST" }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error?.message
        || payload.message
        || "שליחה לליבה נכשלה"
    );
  }

  const payload = await response.json();
  if (payload?.status !== "LOCKED") {
    throw new Error("השרת לא אישר נעילת דוח לאחר שליחה לליבה");
  }
  return payload;
}

export async function processPendingSendRequest(
  request: PendingSendRequest
): Promise<SendQueueItemResult> {
  const { organizationId, reportId } = request;
  let currentPhase: PendingSendSyncPhase = request.syncPhase ?? "queued";

  const setPhase = (phase: PendingSendSyncPhase, lastError?: string) => {
    currentPhase = phase;
    updatePendingSendRequest(organizationId, reportId, {
      syncPhase: phase,
      lastError,
    });
  };

  try {
    setPhase("metadata");
    await flushReportMetadataDraft(organizationId, reportId);

    setPhase("photos");
    const photoResult = await syncPendingLinePhotosForReport(reportId);
    if (photoResult.failed.length) {
      throw new Error(
        `העלאת ${photoResult.failed.length} תמונות נכשלה`
      );
    }

    setPhase("pdf");
    const hasPdf = await hasVisitReportPdfLocally(reportId);
    if (!hasPdf) {
      throw new Error("PDF לא נמצא במכשיר — יש להפיק מחדש לפני שליחה");
    }

    setPhase("request_send");
    await requestSendToCore(reportId);

    removePendingSendRequest(organizationId, reportId);

    return { reportId, success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "סנכרון השליחה נכשל";
    setPhase(currentPhase, message);
    return { reportId, success: false, error: message };
  }
}

export async function processSendQueue(
  organizationId: string
): Promise<ProcessSendQueueResult> {
  const pending = loadPendingSendRequests(organizationId);
  const processed: SendQueueItemResult[] = [];

  for (const request of pending) {
    processed.push(await processPendingSendRequest(request));
  }

  return { processed };
}
