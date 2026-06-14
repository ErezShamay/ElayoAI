/**
 * Gate G→H — v1.0 pilot readiness (supervision pivot).
 * Unified wiring for §10.1–10.5, §14, §17.2 cross-refs, §4 OUT.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GLOBAL_NAV_LINKS } from "@/lib/navigation";
import {
  getSupervisionPrimaryNavLinks,
  getSupervisionProjectSecondaryNavLinks,
} from "@/lib/qc-navigation";
import { PUBLISH_REPORT_CTA_LABEL } from "@/lib/field-reports/publish-access";
import { shouldShowVisitIssueDiff } from "@/lib/quality-issues/visit-issue-diff";

const UI_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(UI_ROOT, "..");

const EXISTING_GATE_TESTS = [
  "tests/lib/field-reports/supervision-pdf-gate.test.ts",
  "tests/lib/apartments/supervision-draft-leak-gate.test.ts",
  "tests/lib/quality-issues/supervision-portfolio-gate.test.ts",
] as const;

const FORBIDDEN_ACTIVE_SURFACE_TERMS = [
  "בקרת איכות",
  "Quality Control",
  "ניהול פרויקטים",
  "Computer Vision",
  "AI operations",
] as const;

const HIDDEN_OUT_ROUTES = [
  "/operational-review",
  "/upload",
  "/automation",
  "/reviews",
  "/actions",
  "/escalations",
  "/alerts",
] as const;

function readUiSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

function readRepoSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("supervision v1 gate (§10 + §17)", () => {
  it("§10.1 wires supervisor field report create → close with DRAFT visibility", () => {
    const visitService = readRepoSource(
      "app/services/field_visit_report_service.py"
    );
    const reportPage = readUiSource("app/(dashboard)/field-reports/[id]/page.tsx");

    expect(visitService).toContain("def close_report(");
    expect(visitService).toContain("created_count=0");
    expect(visitService).toContain("IssueVisibility.DRAFT");
    expect(reportPage).toContain("/close");
    expect(reportPage).toContain("close-preview");
  });

  it("§10.2 wires manager publish → materialization → PDF → deliverables", () => {
    const publishApi = readUiSource("lib/field-reports/publish-api.ts");
    const publishDialog = readUiSource(
      "components/field-reports/PublishReportDialog.tsx"
    );
    const deliverablesPage = readUiSource(
      "app/(dashboard)/portfolio/deliverables/page.tsx"
    );
    const main = readRepoSource("app/main.py");

    expect(PUBLISH_REPORT_CTA_LABEL).toBe("אשר ופרסם לפורטל");
    expect(publishApi).toContain("generateVisitReportPdf");
    expect(publishApi).toContain("pdf_archived");
    expect(publishDialog).toContain("PUBLISH_REPORT_CTA_LABEL");
    expect(deliverablesPage).toContain("DeliverableReportsPanel");
    expect(main).toContain("/field-reports/visits/{report_id}/publish");
  });

  it("§10.3 wires visit diff and issue lifecycle transitions", () => {
    const projectPage = readUiSource("app/(dashboard)/projects/[id]/page.tsx");
    const diffPanel = readUiSource(
      "components/quality-issues/VisitReportIssueDiffPanel.tsx"
    );
    const issueService = readRepoSource("app/services/quality_issue_service.py");
    const e2e = readRepoSource("tests/test_supervision_v1_e2e.py");

    expect(
      shouldShowVisitIssueDiff({
        is_editable: false,
        project_id: "project-1",
        status: "CLOSED",
      })
    ).toBe(true);
    expect(projectPage).toContain("ProjectVisitIssueDiffSummary");
    expect(diffPanel).toContain("getProjectVisitIssueDiff");
    expect(issueService).toContain("get_visit_issue_diff");
    expect(e2e).toContain("issue-diff");
    expect(e2e).toContain('"status": "CLOSED"');
  });

  it("§10.4 wires resident portal published-only and Trust Dashboard", () => {
    const portalView = readUiSource("components/apartments/ResidentPortalView.tsx");
    const myApartment = readUiSource("app/(dashboard)/my-apartment/page.tsx");
    const portalService = readRepoSource("app/services/resident_portal_service.py");

    expect(portalView).toContain("Trust Dashboard");
    expect(portalView).toContain("status_cards");
    expect(portalView).toContain("pdf_downloads");
    expect(myApartment).toContain("ResidentPortalView");
    expect(portalService).toContain("_is_published_visibility");
    expect(portalService).toContain("IssueVisibility.PUBLISHED.value");
  });

  it("§10.5 wires pitch preview route for apartment portal", () => {
    const pitchPage = readUiSource(
      "app/(dashboard)/projects/[id]/apartments/[apartmentId]/page.tsx"
    );
    const portalView = readUiSource("components/apartments/ResidentPortalView.tsx");

    expect(pitchPage).toContain("pitchMode");
    expect(pitchPage).toContain("ResidentPortalView");
    expect(portalView).toContain("pitchMode");
    expect(portalView).toContain("שקיפות ממותגת");
  });

  it("§17.2 cross-refs PDF, draft leak, and portfolio gate tests", () => {
    for (const gatePath of EXISTING_GATE_TESTS) {
      expect(existsSync(path.join(UI_ROOT, gatePath))).toBe(true);
    }

    expect(readUiSource(EXISTING_GATE_TESTS[0])).toContain("§13.3");
    expect(readUiSource(EXISTING_GATE_TESTS[1])).toContain("§13.4");
    expect(readUiSource(EXISTING_GATE_TESTS[2])).toContain("§11.3");
  });

  it("§17.2 documents kill question in pilot checklist", () => {
    const checklist = readRepoSource("docs/PILOT-CHECKLIST.md");

    expect(checklist).toContain("Kill question");
    expect(checklist).toContain("אני לא חוזר ל-Word");
    expect(checklist).toContain("מפקח אמיתי");
  });

  it("§17 Gate I closeout docs — PILOT-REPORT + RELEASE-v1.0", () => {
    const pilotReport = readRepoSource("docs/PILOT-REPORT.md");
    const release = readRepoSource("docs/RELEASE-v1.0.md");
    const checklist = readRepoSource("docs/PILOT-CHECKLIST.md");

    expect(existsSync(path.join(REPO_ROOT, "docs/PILOT-REPORT.md"))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, "docs/RELEASE-v1.0.md"))).toBe(true);

    expect(checklist).toContain("PILOT-REPORT.md");
    expect(pilotReport).toContain("Kill question");
    expect(pilotReport).toContain("§17.2");
    expect(pilotReport).toContain("§18");
    expect(pilotReport).toContain("אני לא חוזר ל-Word");
    expect(pilotReport).toContain("Go / No-Go");

    expect(release).toContain("supervision-v1-gate.test.ts");
    expect(release).toContain("test_supervision_v1_e2e.py");
    expect(release).toContain("PILOT-CHECKLIST.md");
    expect(release).toContain("מוכן בקוד");
  });

  it("§14 avoids forbidden QC/PM messaging on active surfaces", () => {
    const activeSurfaces = [
      "app/(dashboard)/field-reports/page.tsx",
      "app/(dashboard)/issues/page.tsx",
      "app/(dashboard)/portfolio/page.tsx",
      "app/(dashboard)/projects/[id]/page.tsx",
      "components/landing/PublicHomePage.tsx",
      "lib/quality-issues/portfolio-page.ts",
    ].map(readUiSource);

    for (const source of activeSurfaces) {
      for (const term of FORBIDDEN_ACTIVE_SURFACE_TERMS) {
        expect(source).not.toContain(term);
      }
    }
  });

  it("§4 keeps OUT surfaces hidden from primary navigation", () => {
    const primaryHrefs = getSupervisionPrimaryNavLinks({
      role: "SUPERVISOR",
    }).map((link) => link.href);

    expect(GLOBAL_NAV_LINKS).toHaveLength(4);
    expect(primaryHrefs).toEqual(GLOBAL_NAV_LINKS.map((link) => link.href));

    for (const hiddenRoute of HIDDEN_OUT_ROUTES) {
      expect(primaryHrefs).not.toContain(hiddenRoute);
    }

    const projectNav = getSupervisionProjectSecondaryNavLinks("project-1").map(
      (link) => link.href
    );
    expect(projectNav).not.toContain("/reviews");
    expect(projectNav).not.toContain("/actions");
  });

  it("includes pytest E2E loop wiring for §10.1→10.4", () => {
    const e2e = readRepoSource("tests/test_supervision_v1_e2e.py");

    expect(existsSync(path.join(REPO_ROOT, "tests/test_supervision_v1_e2e.py"))).toBe(
      true
    );
    expect(e2e).toContain("§10.1");
    expect(e2e).toContain("§10.2");
    expect(e2e).toContain("§10.3");
    expect(e2e).toContain("§10.4");
    expect(e2e).toContain("publish-preview");
    expect(e2e).toContain("get_portfolio_quality_summary");
  });
});
