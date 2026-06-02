import { apiFetch } from "@/lib/api/client";
import {
  listPendingLinePhotos,
  parseLineIdFromPhotoKey,
  saveLinePhotoLocally,
  type StoredLinePhoto,
} from "@/lib/field-reports/line-photo-store";

export type LinePhotoSyncResult = {
  uploaded: number;
  failed: Array<{ lineId: string; message: string }>;
};

async function uploadLinePhoto(
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
    `/field-reports/visits/${reportId}/lines/${lineId}/photo`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error?.message
        || payload.message
        || "העלאת התמונה נכשלה"
    );
  }

  await saveLinePhotoLocally(reportId, lineId, photo.blob, {
    pendingUpload: false,
  });
}

export async function syncPendingLinePhotosForReport(
  reportId: string
): Promise<LinePhotoSyncResult> {
  const pending = await listPendingLinePhotos(reportId);
  const result: LinePhotoSyncResult = { uploaded: 0, failed: [] };

  for (const photo of pending) {
    const lineId = parseLineIdFromPhotoKey(photo.lineId, reportId);

    try {
      await uploadLinePhoto(reportId, lineId, photo);
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
