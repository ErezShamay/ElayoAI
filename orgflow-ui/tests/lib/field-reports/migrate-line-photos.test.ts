import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  readAllLegacyLinePhotos,
  writeLegacyLinePhotoForTests,
} from "@/lib/field-reports/legacy-line-photo-indexed-db";
import {
  listLinePhotosForLine,
  saveLinePhotoLocally,
} from "@/lib/field-reports/line-photo-store";
import { photoStorageKey, PRIMARY_LINE_PHOTO_ID } from "@/lib/field-reports/line-photo-keys";
import {
  migrateLinePhotosFromLegacyIndexedDb,
  resetLinePhotoMigrationMarkerForTests,
} from "@/lib/field-reports/migrate-line-photos-to-blobs";
import { getLinePhotoBlob } from "@/lib/field-reports/repositories/blobs-repository";

const REPORT_ID = "report-migrate-photos";
const LINE_ID = "line-migrate-photos";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("line photo migration (FR-007)", () => {
  beforeEach(async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    resetLinePhotoMigrationMarkerForTests();
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    resetLinePhotoMigrationMarkerForTests();
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
    vi.unstubAllGlobals();
  });

  it("migrates legacy IndexedDB photos into unified blobs store", async () => {
    const blob = new Blob(["legacy-photo"], { type: "image/png" });
    await writeLegacyLinePhotoForTests({
      lineId: photoStorageKey(REPORT_ID, LINE_ID, PRIMARY_LINE_PHOTO_ID),
      reportId: REPORT_ID,
      lineRowId: LINE_ID,
      photoId: PRIMARY_LINE_PHOTO_ID,
      blob,
      mimeType: "image/png",
      updatedAt: "2026-06-01T12:00:00.000Z",
      pendingUpload: true,
    });

    await migrateLinePhotosFromLegacyIndexedDb();

    const loaded = await getLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      PRIMARY_LINE_PHOTO_ID
    );
    expect(loaded?.mime_type).toBe("image/png");
    expect(loaded?.pending_upload).toBe(true);
    expect(await readAllLegacyLinePhotos()).toHaveLength(0);
  });

  it("line-photo-store adapter reads migrated photos and writes new ones to blobs", async () => {
    await writeLegacyLinePhotoForTests({
      lineId: photoStorageKey(REPORT_ID, LINE_ID, "photo-b"),
      reportId: REPORT_ID,
      lineRowId: LINE_ID,
      photoId: "photo-b",
      blob: new Blob(["b"]),
      mimeType: "image/jpeg",
      updatedAt: "2026-06-01T12:00:00.000Z",
      pendingUpload: false,
    });

    const photos = await listLinePhotosForLine(REPORT_ID, LINE_ID);
    expect(photos).toHaveLength(1);
    expect(photos[0]?.photoId).toBe("photo-b");

    await saveLinePhotoLocally(REPORT_ID, LINE_ID, new Blob(["new"]), {
      pendingUpload: true,
      photoId: "photo-c",
    });

    const afterSave = await listLinePhotosForLine(REPORT_ID, LINE_ID);
    expect(afterSave).toHaveLength(2);
    expect(afterSave.map((photo) => photo.photoId).sort()).toEqual([
      "photo-b",
      "photo-c",
    ]);
  });

  it("migration is idempotent when blobs already exist", async () => {
    await writeLegacyLinePhotoForTests({
      lineId: photoStorageKey(REPORT_ID, LINE_ID, PRIMARY_LINE_PHOTO_ID),
      reportId: REPORT_ID,
      lineRowId: LINE_ID,
      photoId: PRIMARY_LINE_PHOTO_ID,
      blob: new Blob(["once"]),
      mimeType: "image/jpeg",
      updatedAt: "2026-06-01T12:00:00.000Z",
      pendingUpload: true,
    });

    await migrateLinePhotosFromLegacyIndexedDb();
    resetLinePhotoMigrationMarkerForTests();

    await writeLegacyLinePhotoForTests({
      lineId: photoStorageKey(REPORT_ID, LINE_ID, PRIMARY_LINE_PHOTO_ID),
      reportId: REPORT_ID,
      lineRowId: LINE_ID,
      photoId: PRIMARY_LINE_PHOTO_ID,
      blob: new Blob(["twice"]),
      mimeType: "image/jpeg",
      updatedAt: "2026-06-02T12:00:00.000Z",
      pendingUpload: false,
    });

    await migrateLinePhotosFromLegacyIndexedDb();

    const loaded = await getLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      PRIMARY_LINE_PHOTO_ID
    );
    expect(await loaded?.blob.text()).toBe("once");
  });
});
