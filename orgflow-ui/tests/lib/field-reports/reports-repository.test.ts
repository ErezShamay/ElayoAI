import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import { isClientUuid } from "@/lib/field-reports/ids";
import {
  deleteLine,
  deleteLocalReport,
  getLocalReport,
  getLocalReportByServerId,
  listLocalReportsForOrganization,
  saveLocalReport,
  upsertLine,
} from "@/lib/field-reports/repositories/reports-repository";

const ORG_ID = "org-reports-1";
const REPORT_UUID = "client-report-aaa";
const LINE_UUID = "client-line-111";

function baseReportInput() {
  return {
    client_report_uuid: REPORT_UUID,
    organization_id: ORG_ID,
    project_id: "project-1",
    visit_type: "safety_visit",
    visit_date: "2026-06-03",
    header_fields: { notes: "טיוטה" },
    local_status: "LOCAL_IN_PROGRESS" as const,
    lines: [
      {
        client_line_uuid: LINE_UUID,
        id: LINE_UUID,
        sort_order: 1,
        description: "ממצא ראשון",
      },
    ],
  };
}

describe("reports-repository", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("saveLocalReport and getLocalReport round-trip", async () => {
    const saved = await saveLocalReport(baseReportInput());
    const loaded = await getLocalReport(REPORT_UUID);

    expect(loaded).toEqual(saved);
    expect(loaded?.lines).toHaveLength(1);
    expect(loaded?.local_status).toBe("LOCAL_IN_PROGRESS");
    expect(loaded?.created_at).toBeTruthy();
    expect(loaded?.updated_at).toBeTruthy();
  });

  it("getLocalReportByServerId finds report by server id", async () => {
    await saveLocalReport({
      ...baseReportInput(),
      server_report_id: "server-report-99",
    });

    const loaded = await getLocalReportByServerId("server-report-99");
    expect(loaded?.client_report_uuid).toBe(REPORT_UUID);
  });

  it("listLocalReportsForOrganization returns org reports only", async () => {
    await saveLocalReport(baseReportInput());
    await saveLocalReport({
      ...baseReportInput(),
      client_report_uuid: "client-report-bbb",
      organization_id: "org-other",
      project_id: "project-2",
    });

    const orgReports = await listLocalReportsForOrganization(ORG_ID);
    expect(orgReports).toHaveLength(1);
    expect(orgReports[0].client_report_uuid).toBe(REPORT_UUID);
  });

  it("upsertLine updates existing line and adds new line", async () => {
    await saveLocalReport(baseReportInput());

    await upsertLine(REPORT_UUID, {
      client_line_uuid: LINE_UUID,
      description: "ממצא מעודכן",
      status: "DONE",
    });

    const secondLineUuid = "client-line-222";
    await upsertLine(REPORT_UUID, {
      client_line_uuid: secondLineUuid,
      id: secondLineUuid,
      sort_order: 2,
      description: "ממצא שני",
    });

    const loaded = await getLocalReport(REPORT_UUID);
    expect(loaded?.lines).toHaveLength(2);
    expect(loaded?.lines[0].description).toBe("ממצא מעודכן");
    expect(loaded?.lines[0].status).toBe("DONE");
    expect(loaded?.lines[1].client_line_uuid).toBe(secondLineUuid);
  });

  it("deleteLine removes a line and keeps others", async () => {
    await saveLocalReport(baseReportInput());
    await upsertLine(REPORT_UUID, {
      client_line_uuid: "client-line-222",
      id: "client-line-222",
      sort_order: 2,
      description: "נשאר",
    });

    await deleteLine(REPORT_UUID, LINE_UUID);

    const loaded = await getLocalReport(REPORT_UUID);
    expect(loaded?.lines).toHaveLength(1);
    expect(loaded?.lines[0].client_line_uuid).toBe("client-line-222");
  });

  it("assigns client UUIDs when omitted on save and upsert", async () => {
    const saved = await saveLocalReport({
      organization_id: ORG_ID,
      project_id: "project-auto",
      visit_type: "safety_visit",
      visit_date: "2026-06-03",
      header_fields: {},
    });

    expect(isClientUuid(saved.client_report_uuid)).toBe(true);

    const updated = await upsertLine(saved.client_report_uuid, {
      description: "שורה אוטומטית",
    });

    expect(updated?.lines).toHaveLength(1);
    expect(isClientUuid(updated?.lines[0].client_line_uuid)).toBe(true);
  });

  it("deleteLocalReport removes the report", async () => {
    await saveLocalReport(baseReportInput());
    await deleteLocalReport(REPORT_UUID);

    expect(await getLocalReport(REPORT_UUID)).toBeNull();
  });
});
