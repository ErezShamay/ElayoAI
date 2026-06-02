const DB_NAME = "orgflow-field-report-pdfs";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

export type StoredVisitReportPdf = {
  reportId: string;
  blob: Blob;
  filename: string;
  generatedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open PDF store"));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "reportId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function saveVisitReportPdfLocally(
  reportId: string,
  blob: Blob,
  filename: string,
  generatedAt: Date = new Date()
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const record: StoredVisitReportPdf = {
      reportId,
      blob,
      filename,
      generatedAt: generatedAt.toISOString(),
    };
    const request = store.put(record);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to save visit report PDF"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });

  database.close();
}

export async function loadVisitReportPdfLocally(
  reportId: string
): Promise<StoredVisitReportPdf | null> {
  const database = await openDatabase();

  const record = await new Promise<StoredVisitReportPdf | null>(
    (resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(reportId);

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to load visit report PDF"));
      };
      request.onsuccess = () => {
        resolve((request.result as StoredVisitReportPdf | undefined) ?? null);
      };
    }
  );

  database.close();
  return record;
}

export async function hasVisitReportPdfLocally(
  reportId: string
): Promise<boolean> {
  const record = await loadVisitReportPdfLocally(reportId);
  return Boolean(record?.blob);
}

export async function deleteVisitReportPdfLocally(
  reportId: string
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(reportId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to delete visit report PDF"));
    };
    request.onsuccess = () => {
      resolve();
    };
  });

  database.close();
}
