import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import { isClientUuid } from "@/lib/field-reports/ids";
import {
  createLocalVisitReport,
  parseNewReportFormFromCatalog,
} from "@/lib/field-reports/new-report-form";
import { getLocalReport } from "@/lib/field-reports/repositories/reports-repository";

const ORG_ID = "org-new-report";

describe("new-report-form (FR-011)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
    vi.unstubAllGlobals();
  });

  it("parseNewReportFormFromCatalog extracts projects and visit types", () => {
    const parsed = parseNewReportFormFromCatalog({
      organization_id: ORG_ID,
      offline_max_days: 7,
      prepared_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      catalog: {},
      visit_types: [
        { code: "STRUCTURE_SITE", label_he: "שלד / אתר" },
      ],
      organization_profile: {},
      projects: [
        { id: "p-1", project_name: "מגדל א" },
        { id: "", project_name: "ללא מזהה" },
      ],
      reports: [],
    });

    expect(parsed.projects).toHaveLength(1);
    expect(parsed.projects[0]).toMatchObject({
      id: "p-1",
      project_name: "מגדל א",
    });
    expect(parsed.projects[0].prefill).toBeDefined();
    expect(parsed.visitTypes).toEqual([
      { code: "STRUCTURE_SITE", label_he: "שלד / אתר" },
    ]);
  });

  it("createLocalVisitReport persists LOCAL_IN_PROGRESS without network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const saved = await createLocalVisitReport({
      organizationId: ORG_ID,
      userId: "user-1",
      projectId: "p-1",
      projectName: "מגדל א",
      visitType: "STRUCTURE_SITE",
      visitTypeLabelHe: "שלד / אתר",
      visitDate: "2026-06-03",
      catalogVersion: "v-test",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isClientUuid(saved.client_report_uuid)).toBe(true);
    expect(saved.local_status).toBe("LOCAL_IN_PROGRESS");
    expect(saved.project_name).toBe("מגדל א");

    const reloaded = await getLocalReport(saved.client_report_uuid);
    expect(reloaded?.visit_type).toBe("STRUCTURE_SITE");
  });
});
