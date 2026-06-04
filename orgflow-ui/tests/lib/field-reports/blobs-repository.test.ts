import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  canAddLinePhoto,
  countLinePhotoBlobs,
  deleteLinePhotoBlob,
  deleteReportPdfBlob,
  getLinePhotoBlob,
  getReportPdfBlob,
  hasReportPdfBlob,
  listLinePhotoBlobsForLine,
  listLinePhotoBlobsForReport,
  listPendingLinePhotoBlobs,
  PRIMARY_LINE_PHOTO_ID,
  saveLinePhotoBlob,
  saveReportPdfBlob,
} from "@/lib/field-reports/repositories/blobs-repository";

const REPORT_ID = "client-report-photos";
const LINE_ID = "client-line-photos";

describe("blobs-repository", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("saves and loads line photo blobs", async () => {
    const blob = new Blob(["photo-bytes"], { type: "image/jpeg" });
    const photoId = await saveLinePhotoBlob(REPORT_ID, LINE_ID, blob, {
      pendingUpload: true,
      photoId: PRIMARY_LINE_PHOTO_ID,
    });

    expect(photoId).toBe(PRIMARY_LINE_PHOTO_ID);

    const loaded = await getLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      PRIMARY_LINE_PHOTO_ID
    );
    expect(loaded?.blob.type).toBe("image/jpeg");
    expect(loaded?.pending_upload).toBe(true);
    expect(loaded?.line_id).toBe(LINE_ID);
  });

  it("lists photos per report, line, and pending upload", async () => {
    await saveLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      new Blob(["a"]),
      { pendingUpload: true, photoId: "photo-a" }
    );
    await saveLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      new Blob(["b"]),
      { pendingUpload: false, photoId: "photo-b" }
    );
    await saveLinePhotoBlob(
      REPORT_ID,
      "other-line",
      new Blob(["c"]),
      { pendingUpload: true, photoId: "photo-c" }
    );

    expect(await listLinePhotoBlobsForReport(REPORT_ID)).toHaveLength(3);
    expect(await listLinePhotoBlobsForLine(REPORT_ID, LINE_ID)).toHaveLength(2);
    expect(await listPendingLinePhotoBlobs(REPORT_ID)).toHaveLength(2);
    expect(await countLinePhotoBlobs(REPORT_ID, LINE_ID)).toBe(2);
    expect(canAddLinePhoto(2)).toBe(true);
  });

  it("deletes a line photo blob", async () => {
    await saveLinePhotoBlob(
      REPORT_ID,
      LINE_ID,
      new Blob(["x"]),
      { pendingUpload: false, photoId: PRIMARY_LINE_PHOTO_ID }
    );

    await deleteLinePhotoBlob(REPORT_ID, LINE_ID, PRIMARY_LINE_PHOTO_ID);

    expect(
      await getLinePhotoBlob(REPORT_ID, LINE_ID, PRIMARY_LINE_PHOTO_ID)
    ).toBeNull();
  });

  it("saves and loads report PDF blob", async () => {
    const pdfBlob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    await saveReportPdfBlob(REPORT_ID, pdfBlob, "visit-report.pdf");

    expect(await hasReportPdfBlob(REPORT_ID)).toBe(true);

    const loaded = await getReportPdfBlob(REPORT_ID);
    expect(loaded?.filename).toBe("visit-report.pdf");
    expect(loaded?.blob.type).toBe("application/pdf");

    await deleteReportPdfBlob(REPORT_ID);
    expect(await hasReportPdfBlob(REPORT_ID)).toBe(false);
  });
});
