import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const UI_ROOT = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

describe("stage 4.1.6 gate (portfolio page QC-first UI)", () => {
  it("keeps portfolio page QC-first without legacy operational review", () => {
    const page = readSource("app/(dashboard)/portfolio/page.tsx");
    const operationalReview = readSource(
      "components/quality-issues/OperationalReviewPanel.tsx"
    );
    const helpers = readSource("lib/quality-issues/portfolio-page.ts");

    expect(page).toContain("PortfolioQualitySummaryPanel");
    expect(page).toContain("PortfolioProjectRanking");
    expect(page).not.toContain("PortfolioLegacySection");
    expect(page).not.toContain("OperationalReviewPanel");
    expect(page).not.toContain("useOrgQuery");
    expect(page).not.toContain("/portfolio/summary");
    expect(operationalReview).toContain("/portfolio/summary");
    expect(operationalReview).toContain("OPERATIONAL_REVIEW_RANKING_TITLE");
    expect(helpers).toContain("PORTFOLIO_QC_PAGE_SUBTITLE");
  });

  it("hosts operational review on a dedicated page", () => {
    const operationalPage = readSource(
      "app/(dashboard)/operational-review/page.tsx"
    );

    expect(operationalPage).toContain("OperationalReviewPanel");
    expect(operationalPage).toContain("OPERATIONAL_REVIEW_PAGE_TITLE");
  });
});
