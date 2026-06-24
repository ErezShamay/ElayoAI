import { deleteVisitReportPdfLocally } from "@/lib/field-reports/pdf/visit-report-pdf-store";
import { deleteAllBlobsForReport } from "@/lib/field-reports/repositories/blobs-repository";
import {
  deleteLocalReport,
  getLocalReport,
} from "@/lib/field-reports/repositories/reports-repository";
import { removeSyncQueueRecord } from "@/lib/field-reports/repositories/sync-queue-repository";
import { removePendingSendRequest } from "@/lib/field-reports/send-queue";
import { clearFieldReportSyncErrorsForReport } from "@/lib/field-reports/sync/sync-error-monitor";

async function deleteDeviceArtifactsForReportKey(reportKey: string) {
  await deleteAllBlobsForReport(reportKey);
  await deleteVisitReportPdfLocally(reportKey);
}

export async function discardLocalVisitReport(options: {
  organizationId: string;
  clientReportUuid: string;
  serverReportId?: string | null;
}): Promise<void> {
  const { organizationId, clientReportUuid, serverReportId } = options;
  if (!clientReportUuid) {
    return;
  }

  const purgeKeys = new Set<string>([clientReportUuid]);
  if (serverReportId) {
    purgeKeys.add(serverReportId);
  }

  const local = await getLocalReport(clientReportUuid);
  if (local?.server_report_id) {
    purgeKeys.add(local.server_report_id);
  }

  for (const reportKey of purgeKeys) {
    await deleteDeviceArtifactsForReportKey(reportKey);
  }

  await removeSyncQueueRecord(clientReportUuid);
  await deleteLocalReport(clientReportUuid);

  if (organizationId) {
    clearFieldReportSyncErrorsForReport(organizationId, clientReportUuid);
    const resolvedServerId = serverReportId || local?.server_report_id || null;
    if (resolvedServerId) {
      await removePendingSendRequest(organizationId, resolvedServerId);
    }
  }
}
