import { apiFetch } from "@/lib/api/client";
import { isClientUuid } from "@/lib/field-reports/ids";
import {
  listPendingLinePhotos,
  parseLineIdFromPhotoKey,
  parsePhotoIdFromPhotoKey,
  saveLinePhotoLocally,
  type StoredLinePhoto,
} from "@/lib/field-reports/line-photo-store";
import {
  getLocalReport,
  upsertLine,
} from "@/lib/field-reports/repositories/reports-repository";

export type LinePhotoSyncResult = {
  uploaded: number;
  failed: Array<{ lineId: string; message: string }>;
};

type SerializedSyncLine = {
  id?: string;
  client_line_uuid?: string;
};

function buildApiErrorMessage(payload: unknown, fallback: string): string {
  const apiPayload = (payload || {}) as {
    error?: { message?: string };
    message?: string;
  };
  return (
    apiPayload.error?.message
    || apiPayload.message
    || fallback
  );
}

async function uploadLinePhotoLegacy(
  reportId: string,
  lineId: string,
  photo: StoredLinePhoto
) {
  const formData = new FormData();
  const filename =
    photo.mimeType === "image/png" ? "line-photo.png" : "line-photo.jpg";
  formData.append(
    "file",
    photo.blob,
    filename
  );

  const response = await apiFetch(
    `/field-reports/visits/${reportId}/lines/${lineId}/photos`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "העלאת התמונה נכשלה")
    );
  }

  await saveLinePhotoLocally(reportId, lineId, photo.blob, {
    pendingUpload: false,
    photoId: photo.photoId || parsePhotoIdFromPhotoKey(photo.lineId, reportId),
  });
}

async function uploadLinePhotoByClientUuid(
  clientReportUuid: string,
  clientLineUuid: string,
  photo: StoredLinePhoto
): Promise<SerializedSyncLine> {
  const formData = new FormData();
  const filename =
    photo.mimeType === "image/png" ? "line-photo.png" : "line-photo.jpg";
  formData.append("file", photo.blob, filename);

  const response = await apiFetch(
    `/field-reports/visits/sync/${clientReportUuid}/lines/${clientLineUuid}/photos`,
    {
      method: "POST",
      headers: {
        "X-Idempotency-Key": clientLineUuid,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "העלאת התמונה נכשלה")
    );
  }

  const line = (await response.json()) as SerializedSyncLine;
  const reportKey = photo.reportId || clientReportUuid;

  await saveLinePhotoLocally(reportKey, clientLineUuid, photo.blob, {
    pendingUpload: false,
    photoId: photo.photoId || parsePhotoIdFromPhotoKey(photo.lineId, reportKey),
  });

  if (line.id) {
    await upsertLine(clientReportUuid, {
      client_line_uuid: clientLineUuid,
      server_line_id: String(line.id),
    });
  }

  return line;
}

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
      await uploadLinePhotoByClientUuid(
        clientReportUuid,
        clientLineUuid,
        photo
      );
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
        await uploadLinePhotoLegacy(serverReportId, lineId, photo);
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
      await uploadLinePhotoLegacy(reportId, lineId, photo);
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
