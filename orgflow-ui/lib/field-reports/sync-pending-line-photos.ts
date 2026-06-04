import { isClientUuid } from "@/lib/field-reports/ids";
import { uploadStoredLinePhoto } from "@/lib/field-reports/line-photo-upload";
import {
  listPendingLinePhotos,
  parseLineIdFromPhotoKey,
  type StoredLinePhoto,
} from "@/lib/field-reports/line-photo-store";
import { getLocalReport } from "@/lib/field-reports/repositories/reports-repository";

export type LinePhotoSyncResult = {
  uploaded: number;
  failed: Array<{ lineId: string; message: string }>;
};

async function syncPendingLinePhotosByClientReport(
  clientReportUuid: string
): Promise<LinePhotoSyncResult> {
  const pending = await listPendingLinePhotos(clientReportUuid);
  const result: LinePhotoSyncResult = { uploaded: 0, failed: [] };

  for (const photo of pending) {
    const clientLineUuid =
      photo.lineRowId
      || parseLineIdFromPhotoKey(photo.lineId, clientReportUuid);

    try {
      await uploadStoredLinePhoto(photo);
      result.uploaded += 1;
    } catch (err: unknown) {
      result.failed.push({
        lineId: clientLineUuid,
        message:
          err instanceof Error ? err.message : "העלאת התמונה נכשלה",
      });
    }
  }

  const local = await getLocalReport(clientReportUuid);
  const serverReportId = local?.server_report_id;
  if (serverReportId && serverReportId !== clientReportUuid) {
    const serverPending = await listPendingLinePhotos(serverReportId);
    for (const photo of serverPending) {
      const lineId =
        photo.lineRowId
        || parseLineIdFromPhotoKey(photo.lineId, serverReportId);

      try {
        await uploadStoredLinePhoto({
          ...photo,
          reportId: serverReportId,
        });
        result.uploaded += 1;
      } catch (err: unknown) {
        result.failed.push({
          lineId,
          message:
            err instanceof Error ? err.message : "העלאת התמונה נכשלה",
        });
      }
    }
  }

  return result;
}

export async function syncPendingLinePhotosForReport(
  reportId: string
): Promise<LinePhotoSyncResult> {
  if (isClientUuid(reportId)) {
    return syncPendingLinePhotosByClientReport(reportId);
  }

  const pending = await listPendingLinePhotos(reportId);
  const result: LinePhotoSyncResult = { uploaded: 0, failed: [] };

  for (const photo of pending) {
    const lineId = photo.lineRowId || parseLineIdFromPhotoKey(photo.lineId, reportId);

    try {
      await uploadStoredLinePhoto(photo);
      result.uploaded += 1;
    } catch (err: unknown) {
      result.failed.push({
        lineId,
        message:
          err instanceof Error ? err.message : "העלאת התמונה נכשלה",
      });
    }
  }

  return result;
}

export async function syncAllPendingLinePhotos(): Promise<LinePhotoSyncResult> {
  const pending = await listPendingLinePhotos();
  const byReport = new Map<string, StoredLinePhoto[]>();

  for (const photo of pending) {
    const list = byReport.get(photo.reportId) ?? [];
    list.push(photo);
    byReport.set(photo.reportId, list);
  }

  const result: LinePhotoSyncResult = { uploaded: 0, failed: [] };

  for (const reportId of byReport.keys()) {
    const reportResult = await syncPendingLinePhotosForReport(reportId);
    result.uploaded += reportResult.uploaded;
    result.failed.push(...reportResult.failed);
  }

  return result;
}
