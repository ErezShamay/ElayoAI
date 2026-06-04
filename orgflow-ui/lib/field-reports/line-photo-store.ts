import { MAX_LINE_PHOTOS } from "@/lib/field-reports/line-photo-constants";
import {
  parseLineIdFromPhotoKey,
  parsePhotoIdFromPhotoKey,
  photoStorageKey,
  PRIMARY_LINE_PHOTO_ID,
} from "@/lib/field-reports/line-photo-keys";
import { ensureLinePhotosMigratedToBlobs } from "@/lib/field-reports/migrate-line-photos-to-blobs";
import type { BlobRecord } from "@/lib/field-reports/db/schema";
import {
  canAddLinePhoto as canAddLinePhotoBlob,
  countLinePhotoBlobs,
  deleteLinePhotoBlob,
  getLinePhotoBlob,
  listLinePhotoBlobsForLine,
  listLinePhotoBlobsForReport,
  listPendingLinePhotoBlobs,
  saveLinePhotoBlob,
} from "@/lib/field-reports/repositories/blobs-repository";

export {
  PRIMARY_LINE_PHOTO_ID,
  photoStorageKey,
  parseLineIdFromPhotoKey,
  parsePhotoIdFromPhotoKey,
};

export type StoredLinePhoto = {
  lineId: string;
  reportId: string;
  lineRowId: string;
  photoId: string;
  blob: Blob;
  mimeType: string;
  updatedAt: string;
  pendingUpload: boolean;
};

function blobRecordToStoredLinePhoto(record: BlobRecord): StoredLinePhoto {
  const lineRowId = record.line_id ?? "";
  const photoId = record.photo_id ?? PRIMARY_LINE_PHOTO_ID;

  return {
    lineId: photoStorageKey(record.report_id, lineRowId, photoId),
    reportId: record.report_id,
    lineRowId,
    photoId,
    blob: record.blob,
    mimeType: record.mime_type,
    updatedAt: record.updated_at,
    pendingUpload: record.pending_upload === true,
  };
}

export async function saveLinePhotoLocally(
  reportId: string,
  lineId: string,
  file: Blob,
  options: { pendingUpload: boolean; photoId?: string }
): Promise<string> {
  await ensureLinePhotosMigratedToBlobs();
  return saveLinePhotoBlob(reportId, lineId, file, {
    pendingUpload: options.pendingUpload,
    photoId: options.photoId,
  });
}

export async function loadLinePhotoLocally(
  reportId: string,
  lineId: string,
  photoId: string = PRIMARY_LINE_PHOTO_ID
): Promise<StoredLinePhoto | null> {
  await ensureLinePhotosMigratedToBlobs();
  const record = await getLinePhotoBlob(reportId, lineId, photoId);
  return record ? blobRecordToStoredLinePhoto(record) : null;
}

export async function listLinePhotosForLine(
  reportId: string,
  lineId: string
): Promise<StoredLinePhoto[]> {
  await ensureLinePhotosMigratedToBlobs();
  const records = await listLinePhotoBlobsForLine(reportId, lineId);
  return records.map(blobRecordToStoredLinePhoto);
}

export async function listLinePhotosForReport(
  reportId: string
): Promise<StoredLinePhoto[]> {
  await ensureLinePhotosMigratedToBlobs();
  const records = await listLinePhotoBlobsForReport(reportId);
  return records.map(blobRecordToStoredLinePhoto);
}

export async function listPendingLinePhotos(
  reportId?: string
): Promise<StoredLinePhoto[]> {
  await ensureLinePhotosMigratedToBlobs();
  const records = await listPendingLinePhotoBlobs(reportId);
  return records.map(blobRecordToStoredLinePhoto);
}

export async function deleteLinePhotoLocally(
  reportId: string,
  lineId: string,
  photoId: string = PRIMARY_LINE_PHOTO_ID
): Promise<void> {
  await ensureLinePhotosMigratedToBlobs();
  await deleteLinePhotoBlob(reportId, lineId, photoId);
}

export async function countLinePhotosLocally(
  reportId: string,
  lineId: string
): Promise<number> {
  await ensureLinePhotosMigratedToBlobs();
  return countLinePhotoBlobs(reportId, lineId);
}

export function canAddLinePhoto(count: number): boolean {
  return canAddLinePhotoBlob(count);
}

export function createLinePhotoObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}
