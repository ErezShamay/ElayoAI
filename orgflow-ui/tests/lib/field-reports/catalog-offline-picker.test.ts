import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  catalogPayloadHasIssues,
  loadOfflineCatalogForPicker,
  OFFLINE_CATALOG_UNAVAILABLE_MESSAGE,
} from "@/lib/field-reports/catalog-offline";
import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import { saveFromOfflinePrep } from "@/lib/field-reports/repositories/catalog-repository";

const ORG_ID = "org-catalog-picker";

function samplePrepPayload() {
  return {
    offline_max_days: 7,
    catalog_version: "v1",
    catalog: {
      families: [{ top_family: "SAFETY", label_he: "בטיחות" }],
      categories: [
        {
          top_family: "SAFETY",
          category_id: "c1",
          category_name_he: "קטגוריה",
        },
      ],
      issues: [
        {
          issue_id: "i1",
          issue_name_he: "ממצא",
          top_family: "SAFETY",
          category_id: "c1",
          category_name_he: "קטגוריה",
        },
      ],
    },
    visit_types: [
      {
        code: "safety_visit",
        allowed_top_families: ["SAFETY"],
      },
    ],
    organization_profile: {},
    projects: [],
    reports: [],
  };
}

describe("catalog-offline picker (FR-014)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("loadOfflineCatalogForPicker returns filtered catalog from IndexedDB", async () => {
    await saveFromOfflinePrep(ORG_ID, samplePrepPayload());

    const catalog = await loadOfflineCatalogForPicker(
      ORG_ID,
      "safety_visit"
    );

    expect(catalogPayloadHasIssues(catalog)).toBe(true);
    expect(catalog?.issues).toHaveLength(1);
    expect(catalog?.issues?.[0]?.issue_id).toBe("i1");
  });

  it("OFFLINE_CATALOG_UNAVAILABLE_MESSAGE is defined for UI", () => {
    expect(OFFLINE_CATALOG_UNAVAILABLE_MESSAGE).toContain("הכנה");
  });
});
