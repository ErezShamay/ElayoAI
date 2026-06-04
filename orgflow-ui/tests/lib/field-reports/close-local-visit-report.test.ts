import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeLocalVisitReport,
  finishLocalVisitReportWithPdf,
} from "@/lib/field-reports/close-local-visit-report";
import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  hasReportPdfBlob,
  saveReportPdfBlob,
} from "@/lib/field-reports/repositories/blobs-repository";
import {
  countSyncQueueForUser,
} from "@/lib/field-reports/repositories/sync-queue-repository";
import {
  getLocalReport,
  saveLocalReport,
} from "@/lib/field-reports/repositories/reports-repository";
import { localVisitReportToView } from "@/lib/field-reports/visit-report-view";

const ORG_ID = "org-close-local";
const USER_ID = "user-close-local";
const CLIENT_UUID = "a1111111-1111-4111-8111-111111111111";

vi.mock("@/lib/field-reports/pdf/generate-visit-report-pdf", () => ({
  generateVisitReportPdf: vi.fn(async () =>
    new Blob(["pdf-bytes"], { type: "application/pdf" })
  ),
}));

describe("close-local-visit-report (FR-016)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
    await saveLocalReport({
      client_report_uuid: CLIENT_UUID,
      organization_id: ORG_ID,
      user_id: USER_ID,
      project_id: "p1",
      visit_type: "STRUCTURE_SITE",
      visit_type_label_he: "שלד",
      visit_date: "2026-06-03",
      header_fields: {},
      local_status: "LOCAL_IN_PROGRESS",
      lines: [
        {
          client_line_uuid: "b2222222-2222-4222-8222-222222222222",
          id: "b2222222-2222-4222-8222-222222222222",
          sort_order: 1,
          description: "ממצא",
        },
      ],
    });
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
    vi.clearAllMocks();
  });

  it("closeLocalVisitReport sets LOCAL_CLOSED, closed_at, sync pending", async () => {
    const closed = await closeLocalVisitReport(CLIENT_UUID);

    expect(closed.local_status).toBe("LOCAL_CLOSED");
    expect(closed.sync_status).toBe("pending");
    expect(closed.closed_at).toBeTruthy();
    expect(await countSyncQueueForUser(ORG_ID, USER_ID)).toBe(1);

    const view = localVisitReportToView(closed);
    expect(view.is_editable).toBe(false);
    expect(view.status_label_he).toBe("סגור (מקומי)");
  });

  it("finishLocalVisitReportWithPdf saves PDF to blobs store", async () => {
    const record = (await getLocalReport(CLIENT_UUID))!;
    const view = localVisitReportToView(record);

    const result = await finishLocalVisitReportWithPdf({
      report: view,
      inspector: { full_name: "מפקח" },
    });

    expect(result.record.local_status).toBe("LOCAL_CLOSED");
    expect(result.pdfSource).toBe("generated");
    expect(await hasReportPdfBlob(CLIENT_UUID)).toBe(true);
  });

  it("finishLocalVisitReportWithPdf reuses cached PDF", async () => {
    await closeLocalVisitReport(CLIENT_UUID);
    await saveReportPdfBlob(
      CLIENT_UUID,
      new Blob(["cached"], { type: "application/pdf" }),
      "report.pdf"
    );

    const record = (await getLocalReport(CLIENT_UUID))!;
    const result = await finishLocalVisitReportWithPdf({
      report: localVisitReportToView(record),
    });

    expect(result.pdfSource).toBe("cache");
  });
});
