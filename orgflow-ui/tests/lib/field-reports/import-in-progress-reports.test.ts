import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  filterInProgressPrepReports,
  importInProgressReportsFromOfflinePrep,
  mapServerVisitReportToLocalInput,
  type ServerVisitReportPayload,
} from "@/lib/field-reports/import-in-progress-reports";
import {
  getLocalReport,
  getLocalReportByServerId,
  saveLocalReport,
} from "@/lib/field-reports/repositories/reports-repository";
import { loadVisitReportForPage } from "@/lib/field-reports/visit-report-view";

const ORG_ID = "org-import-prep";
const SERVER_REPORT_ID = "server-report-in-progress";
const CLIENT_UUID = "a1111111-1111-4111-8111-111111111111";

const SERVER_REPORT: ServerVisitReportPayload = {
  id: SERVER_REPORT_ID,
  status: "IN_PROGRESS",
  project_id: "project-1",
  project_name: "פרויקט משרד",
  visit_type: "STRUCTURE_SITE",
  visit_type_label_he: "שלד / אתר",
  visit_date: "2026-06-03",
  header_fields: { contractor_notes: ["הערה"] },
  catalog_version: "cat-v1",
  lines: [
    {
      id: "line-server-1",
      sort_order: 1,
      description: "ממצא מהמשרד",
      has_photo: false,
    },
  ],
};

describe("import-in-progress-reports (FR-017)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("filterInProgressPrepReports keeps only IN_PROGRESS summaries", () => {
    const filtered = filterInProgressPrepReports([
      { id: "r1", status: "IN_PROGRESS" },
      { id: "r2", status: "CLOSED" },
      { id: "r3" },
    ]);

    expect(filtered).toEqual([{ id: "r1", status: "IN_PROGRESS" }]);
  });

  it("imports full server report into reports store", async () => {
    const result = await importInProgressReportsFromOfflinePrep({
      organizationId: ORG_ID,
      prepReports: [{ id: SERVER_REPORT_ID, status: "IN_PROGRESS" }],
      fetchVisitReport: async () => SERVER_REPORT,
    });

    expect(result.imported).toBe(1);
    expect(result.failed).toEqual([]);

    const local = await getLocalReportByServerId(SERVER_REPORT_ID);
    expect(local?.local_status).toBe("LOCAL_IN_PROGRESS");
    expect(local?.sync_status).toBe("done");
    expect(local?.lines).toHaveLength(1);
    expect(local?.lines[0].description).toBe("ממצא מהמשרד");
    expect(local?.lines[0].server_line_id).toBe("line-server-1");
  });

  it("updates existing local report by server id without changing client uuid", async () => {
    await saveLocalReport({
      client_report_uuid: CLIENT_UUID,
      server_report_id: SERVER_REPORT_ID,
      organization_id: ORG_ID,
      project_id: "project-1",
      visit_type: "STRUCTURE_SITE",
      visit_date: "2026-06-01",
      header_fields: {},
      local_status: "LOCAL_IN_PROGRESS",
      lines: [
        {
          client_line_uuid: "b2222222-2222-4222-8222-222222222222",
          id: "line-server-1",
          server_line_id: "line-server-1",
          sort_order: 1,
          description: "ישן",
        },
      ],
    });

    const result = await importInProgressReportsFromOfflinePrep({
      organizationId: ORG_ID,
      prepReports: [{ id: SERVER_REPORT_ID, status: "IN_PROGRESS" }],
      fetchVisitReport: async () => SERVER_REPORT,
    });

    expect(result.updated).toBe(1);

    const local = await getLocalReport(CLIENT_UUID);
    expect(local?.lines[0].client_line_uuid).toBe(
      "b2222222-2222-4222-8222-222222222222"
    );
    expect(local?.lines[0].description).toBe("ממצא מהמשרד");
  });

  it("loadVisitReportForPage resolves imported office report when offline", async () => {
    await importInProgressReportsFromOfflinePrep({
      organizationId: ORG_ID,
      prepReports: [{ id: SERVER_REPORT_ID, status: "IN_PROGRESS" }],
      fetchVisitReport: async () => SERVER_REPORT,
    });

    const loaded = await loadVisitReportForPage(SERVER_REPORT_ID, {
      navigatorOnline: false,
      apiReachable: false,
    });

    expect(loaded.source).toBe("local");
    expect(loaded.report.project_name).toBe("פרויקט משרד");
    expect(loaded.report.lines[0].description).toBe("ממצא מהמשרד");
  });

  it("mapServerVisitReportToLocalInput preserves client_report_uuid", () => {
    const input = mapServerVisitReportToLocalInput(
      SERVER_REPORT,
      ORG_ID,
      "user-1",
      {
        client_report_uuid: CLIENT_UUID,
        server_report_id: SERVER_REPORT_ID,
        organization_id: ORG_ID,
        project_id: "project-1",
        visit_type: "STRUCTURE_SITE",
        visit_date: "2026-06-01",
        header_fields: {},
        lines: [],
        local_status: "LOCAL_IN_PROGRESS",
        sync_status: "pending",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
      }
    );

    expect(input.client_report_uuid).toBe(CLIENT_UUID);
    expect(input.local_status).toBe("LOCAL_IN_PROGRESS");
  });
});
