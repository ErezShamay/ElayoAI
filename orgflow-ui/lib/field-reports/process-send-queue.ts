import {
  finalizeVisitReport,
  waitForFinalizeReportStatus,
} from "@/lib/field-reports/finalize-api";
import {
  loadVisitReportPdfLocally,
} from "@/lib/field-reports/pdf/visit-report-pdf-store";
import { flushReportMetadataDraft } from "@/lib/field-reports/report-metadata-draft";
import {
  loadPendingSendRequests,
  removePendingSendRequest,
  updatePendingSendRequest,
  type PendingSendRequest,
  type PendingSendSyncPhase,
} from "@/lib/field-reports/send-queue";
import { purgeFieldReportAfterCoreSend } from "@/lib/field-reports/purge-field-report-after-core-send";
import { syncPendingLinePhotosForReport } from "@/lib/field-reports/sync-pending-line-photos";

export type SendQueueItemResult = {
  reportId: string;
  success: boolean;
  error?: string;
};

export type ProcessSendQueueResult = {
  processed: SendQueueItemResult[];
};

export async function processPendingSendRequest(
  request: PendingSendRequest
): Promise<SendQueueItemResult> {
  const { organizationId, reportId } = request;
  const idempotencyKey =
    request.idempotencyKey
    || `field-report-send:${reportId}:${request.requestedAt}`;
  let currentPhase: PendingSendSyncPhase = request.syncPhase ?? "queued";

  const setPhase = async (phase: PendingSendSyncPhase, lastError?: string) => {
    currentPhase = phase;
    await updatePendingSendRequest(organizationId, reportId, {
      syncPhase: phase,
      lastError,
    });
  };

  if (request.idempotencyKey !== idempotencyKey) {
    await updatePendingSendRequest(organizationId, reportId, {
      idempotencyKey,
    });
  }

  try {
    await setPhase("metadata");
    await flushReportMetadataDraft(organizationId, reportId);

    await setPhase("photos");
    const photoResult = await syncPendingLinePhotosForReport(reportId);
    if (photoResult.failed.length) {
      throw new Error(
        `העלאת ${photoResult.failed.length} תמונות נכשלה`
      );
    }

    await setPhase("pdf");
    const storedPdf = await loadVisitReportPdfLocally(reportId);
    if (!storedPdf?.blob) {
      throw new Error("PDF לא נמצא במכשיר - יש להפיק מחדש לפני עיבוד");
    }

    await setPhase("finalize");
    await finalizeVisitReport(
      reportId,
      {
        blob: storedPdf.blob,
        filename: storedPdf.filename || `${reportId}.pdf`,
      },
      {
        idempotencyKey,
        clientReportUuid: request.clientReportUuid,
      }
    );

    const status = await waitForFinalizeReportStatus(reportId);
    if (status.status === "FINALIZE_FAILED") {
      throw new Error("עיבוד הדוח נכשל לאחר סנכרון");
    }

    await purgeFieldReportAfterCoreSend({
      organizationId,
      serverReportId: reportId,
    });

    return { reportId, success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "סנכרון השליחה נכשל";
    await setPhase(currentPhase, message);
    return { reportId, success: false, error: message };
  }
}

export async function processSendQueue(
  organizationId: string
): Promise<ProcessSendQueueResult> {
  const pending = await loadPendingSendRequests(organizationId);
  const processed: SendQueueItemResult[] = [];

  for (const request of pending) {
    processed.push(await processPendingSendRequest(request));
  }

  return { processed };
}
