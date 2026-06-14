/**
 * Gate E→F — Draft leak §13.4 (supervision pivot).
 * דייר לא רואה DRAFT — אפס exceptions.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const UI_ROOT = path.resolve(__dirname, "../../..");
const REPO_ROOT = path.resolve(UI_ROOT, "..");

function readUiSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

function readRepoSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("supervision draft leak gate (§13.4)", () => {
  it("hard-blocks DRAFT in resident portal collectors", () => {
    const service = readRepoSource("app/services/resident_portal_service.py");

    expect(service).toContain("_is_published_visibility");
    expect(service).toContain("IssueVisibility.PUBLISHED.value");
    expect(service).toContain("if not _is_published_visibility(issue.get(\"visibility\"))");
    expect(service).toContain("if _is_published_visibility(line.get(\"visibility\"))");
    expect(service).not.toContain("is_visible_to_resident(");
  });

  it("exposes trust dashboard defaults instead of issue list", () => {
    const portalView = readUiSource("components/apartments/ResidentPortalView.tsx");
    const types = readUiSource("lib/apartments/types.ts");
    const schema = readRepoSource("app/schemas/project_apartment.py");

    expect(types).toContain('default_view: "trust_dashboard"');
    expect(types).toContain("status_cards");
    expect(schema).toContain("status_cards");
    expect(schema).toContain('default_view: Literal["trust_dashboard"]');
    expect(portalView).toContain("Trust Dashboard");
    expect(portalView).toContain("status_cards");
    expect(portalView).toContain("showDetails");
    expect(portalView).toContain("תצוגת ברירת המחדל מציגה סטטוס מרוכז");
  });

  it("includes published PDF download center wiring", () => {
    const service = readRepoSource("app/services/resident_portal_service.py");
    const portalView = readUiSource("components/apartments/ResidentPortalView.tsx");
    const main = readRepoSource("app/main.py");

    expect(service).toContain("pdf_downloads");
    expect(service).toContain("pdf_storage_path");
    expect(portalView).toContain("מרכז הורדות");
    expect(portalView).toContain("pdf_downloads");
    expect(main).toContain("/resident-portal/reports/{report_id}/pdf");
  });

  it("avoids QC messaging in resident portal surfaces", () => {
    const portalView = readUiSource("components/apartments/ResidentPortalView.tsx");
    const myApartment = readUiSource("app/(dashboard)/my-apartment/page.tsx");
    const preview = readUiSource(
      "app/(dashboard)/projects/[id]/apartments/[apartmentId]/page.tsx"
    );

    for (const source of [portalView, myApartment, preview]) {
      expect(source).not.toMatch(/בקרת איכות/i);
      expect(source).not.toMatch(/\bQC\b/);
    }
  });
});
