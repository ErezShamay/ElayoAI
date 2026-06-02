const DB_NAME = "orgflow-field-report-line-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

export type StoredLinePhoto = {
  lineId: string;
  reportId: string;
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

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "lineId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function photoKey(reportId: string, lineId: string) {
  return `${reportId}:${lineId}`;
}

export async function saveLinePhotoLocally(
  reportId: string,
  lineId: string,
  file: Blob,
  options: { pendingUpload: boolean }
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const record: StoredLinePhoto = {
      lineId: photoKey(reportId, lineId),
      reportId,
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
}

export async function loadLinePhotoLocally(
  reportId: string,
  lineId: string
): Promise<StoredLinePhoto | null> {
  const database = await openDatabase();

  const record = await new Promise<StoredLinePhoto | null>(
    (resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(photoKey(reportId, lineId));

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
  return lineKey.startsWith(prefix) ? lineKey.slice(prefix.length) : lineKey;
}

export async function deleteLinePhotoLocally(
  reportId: string,
  lineId: string
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(photoKey(reportId, lineId));

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to delete line photo"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });

  database.close();
}

export function createLinePhotoObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}
