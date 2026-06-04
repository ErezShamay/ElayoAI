import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FIELD_REPORT_STORES } from "@/lib/field-reports/db/schema";
import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
  getFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  clearCatalogBundle,
  getCatalogForVisitType,
  isExpired,
  loadCatalogBundle,
  saveFromOfflinePrep,
} from "@/lib/field-reports/repositories/catalog-repository";

const ORG_ID = "org-test-1";

function samplePrepPayload() {
  return {
    offline_max_days: 7,
    catalog_version: "v1",
    catalog: {
      catalog_version: "v1",
      families: [
        { top_family: "SAFETY", label_he: "בטיחות" },
        { top_family: "QUALITY", label_he: "איכות" },
      ],
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
        {
          issue_id: "i2",
          issue_name_he: "ממצא אחר",
          top_family: "QUALITY",
          category_id: "c2",
          category_name_he: "איכות",
        },
      ],
    },
    visit_types: [
      {
        code: "safety_visit",
        allowed_top_families: ["SAFETY"],
      },
    ],
    organization_profile: { name: "Org" },
    projects: [{ id: "p1" }],
    reports: [],
  };
}

describe("catalog-repository", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("round-trips saveFromOfflinePrep and loadCatalogBundle", async () => {
    const saved = await saveFromOfflinePrep(ORG_ID, samplePrepPayload());

    expect(saved.organization_id).toBe(ORG_ID);
    expect(saved.prepared_at).toBeTruthy();
    expect(saved.expires_at).toBeTruthy();

    const preparedMs = new Date(saved.prepared_at).getTime();
    const expiresMs = new Date(saved.expires_at).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresMs - preparedMs).toBe(sevenDaysMs);

    const loaded = await loadCatalogBundle(ORG_ID);
    expect(loaded).toEqual(saved);
    expect(loaded?.projects).toHaveLength(1);
  });

  it("isExpired is false before expiry and true after", async () => {
    const bundle = await saveFromOfflinePrep(ORG_ID, samplePrepPayload());

    expect(isExpired(bundle)).toBe(false);
    expect(isExpired(null)).toBe(true);

    expect(
      isExpired({
        ...bundle,
        expires_at: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(true);
  });

  it("getCatalogForVisitType filters issues by visit type", async () => {
    await saveFromOfflinePrep(ORG_ID, samplePrepPayload());

    const catalog = await getCatalogForVisitType(ORG_ID, "safety_visit");

    expect(catalog?.issues).toHaveLength(1);
    expect(catalog?.issues?.[0]?.issue_id).toBe("i1");
    expect(catalog?.families).toHaveLength(1);
    expect(catalog?.families?.[0]?.top_family).toBe("SAFETY");
  });

  it("getCatalogForVisitType returns null when bundle expired", async () => {
    const bundle = await saveFromOfflinePrep(ORG_ID, samplePrepPayload());
    const database = await getFieldReportDatabase();
    await database.put(FIELD_REPORT_STORES.catalog, {
      ...bundle,
      expires_at: "2020-01-01T00:00:00.000Z",
    });

    const catalog = await getCatalogForVisitType(ORG_ID, "safety_visit");
    expect(catalog).toBeNull();
  });

  it("clearCatalogBundle removes the record", async () => {
    await saveFromOfflinePrep(ORG_ID, samplePrepPayload());
    await clearCatalogBundle(ORG_ID);

    expect(await loadCatalogBundle(ORG_ID)).toBeNull();
  });
});
