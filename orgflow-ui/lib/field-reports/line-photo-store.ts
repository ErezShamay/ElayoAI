import { MAX_LINE_PHOTOS } from "@/lib/field-reports/line-photo-constants";

const DB_NAME = "orgflow-field-report-line-photos";
const DB_VERSION = 2;
const STORE_NAME = "photos";

/** מזהה תמונה מקומית ראשית — תאימות לגרסה 1. */
export const PRIMARY_LINE_PHOTO_ID = "primary";

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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open photo store"));
    };

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const upgrade = event.target as IDBOpenDBRequest;
      const transaction = upgrade.transaction;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "lineId" });
        return;
      }

      if (event.oldVersion < 2 && transaction) {
        const store = transaction.objectStore(STORE_NAME);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const records = (getAll.result as StoredLinePhoto[]) ?? [];
          for (const record of records) {
            if (!record.photoId) {
              const lineRowId = parseLineIdFromPhotoKey(record.lineId, record.reportId);
              const migrated: StoredLinePhoto = {
                ...record,
                lineRowId,
                photoId: PRIMARY_LINE_PHOTO_ID,
                lineId: photoStorageKey(
                  record.reportId,
                  lineRowId,
                  PRIMARY_LINE_PHOTO_ID
                ),
              };
              store.delete(record.lineId);
              store.put(migrated);
            }
          }
        };
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export function photoStorageKey(
  reportId: string,
  lineId: string,
  photoId: string
) {
  return `${reportId}:${lineId}:${photoId}`;
}

export async function saveLinePhotoLocally(
  reportId: string,
  lineId: string,
  file: Blob,
  options: { pendingUpload: boolean; photoId?: string }
): Promise<string> {
  const photoId = options.photoId ?? crypto.randomUUID();
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const record: StoredLinePhoto = {
      lineId: photoStorageKey(reportId, lineId, photoId),
      reportId,
      lineRowId: lineId,
      photoId,
      blob: file,
      mimeType: file.type || "image/jpeg",
      updatedAt: new Date().toISOString(),
      pendingUpload: options.pendingUpload,
    };
    const request = store.put(record);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to save line photo"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });

  database.close();
  return photoId;
}

export async function loadLinePhotoLocally(
  reportId: string,
  lineId: string,
  photoId: string = PRIMARY_LINE_PHOTO_ID
): Promise<StoredLinePhoto | null> {
  const database = await openDatabase();

  const record = await new Promise<StoredLinePhoto | null>(
    (resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(photoStorageKey(reportId, lineId, photoId));

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to load line photo"));
      };
      request.onsuccess = () => {
        resolve((request.result as StoredLinePhoto | undefined) ?? null);
      };
    }
  );

  database.close();
  return record;
}

export async function listLinePhotosForLine(
  reportId: string,
  lineId: string
): Promise<StoredLinePhoto[]> {
  const all = await listLinePhotosForReport(reportId);
  return all
    .filter((record) => record.lineRowId === lineId)
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

export async function listLinePhotosForReport(
  reportId: string
): Promise<StoredLinePhoto[]> {
  const database = await openDatabase();

  const records = await new Promise<StoredLinePhoto[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list line photos"));
    };
    request.onsuccess = () => {
      resolve((request.result as StoredLinePhoto[]) ?? []);
    };
  });

  database.close();
  return records.filter((record) => record.reportId === reportId);
}

export async function listPendingLinePhotos(
  reportId?: string
): Promise<StoredLinePhoto[]> {
  const database = await openDatabase();

  const records = await new Promise<StoredLinePhoto[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list line photos"));
    };
    request.onsuccess = () => {
      resolve((request.result as StoredLinePhoto[]) ?? []);
    };
  });

  database.close();

  return records.filter((record) => {
    if (!record.pendingUpload) {
      return false;
    }
    if (reportId && record.reportId !== reportId) {
      return false;
    }
    return true;
  });
}

export function parseLineIdFromPhotoKey(lineKey: string, reportId: string) {
  const prefix = `${reportId}:`;
  if (!lineKey.startsWith(prefix)) {
    return lineKey;
  }
  const remainder = lineKey.slice(prefix.length);
  const parts = remainder.split(":");
  return parts[0] ?? remainder;
}

export function parsePhotoIdFromPhotoKey(lineKey: string, reportId: string) {
  const prefix = `${reportId}:`;
  if (!lineKey.startsWith(prefix)) {
    return PRIMARY_LINE_PHOTO_ID;
  }
  const remainder = lineKey.slice(prefix.length);
  const parts = remainder.split(":");
  return parts[1] ?? PRIMARY_LINE_PHOTO_ID;
}

export async function deleteLinePhotoLocally(
  reportId: string,
  lineId: string,
  photoId: string = PRIMARY_LINE_PHOTO_ID
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(photoStorageKey(reportId, lineId, photoId));

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to delete line photo"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });

  database.close();
}

export async function countLinePhotosLocally(
  reportId: string,
  lineId: string
): Promise<number> {
  const photos = await listLinePhotosForLine(reportId, lineId);
  return photos.length;
}

export function canAddLinePhoto(count: number): boolean {
  return count < MAX_LINE_PHOTOS;
}

export function createLinePhotoObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}
