import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  hasReportPdfBlob,
} from "@/lib/field-reports/repositories/blobs-repository";
import {
  hasVisitReportPdfLocally,
  loadVisitReportPdfLocally,
  saveVisitReportPdfLocally,
  visitReportPdfStorageKey,
} from "@/lib/field-reports/pdf/visit-report-pdf-store";

const REPORT_ID = "a1111111-1111-4111-8111-111111111111";

describe("visit-report-pdf-store (FR-016 blobs)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("visitReportPdfStorageKey prefers client_report_uuid", () => {
    expect(
      visitReportPdfStorageKey({
        id: "server-1",
        client_report_uuid: REPORT_ID,
      })
    ).toBe(REPORT_ID);
  });

  it("save and load PDF via unified blobs store", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    await saveVisitReportPdfLocally(REPORT_ID, blob, "visit.pdf");

    expect(await hasVisitReportPdfLocally(REPORT_ID)).toBe(true);
    expect(await hasReportPdfBlob(REPORT_ID)).toBe(true);

    const loaded = await loadVisitReportPdfLocally(REPORT_ID);
    expect(loaded?.filename).toBe("visit.pdf");
    expect(loaded?.blob.type).toBe("application/pdf");
  });
});
