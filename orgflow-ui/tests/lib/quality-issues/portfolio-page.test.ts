import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_QC_PAGE_SUBTITLE,
  PORTFOLIO_QC_PAGE_TITLE,
} from "@/lib/quality-issues/portfolio-page";

describe("portfolio page helpers (4.1.6)", () => {
  it("positions QC as the primary portfolio view", () => {
    expect(PORTFOLIO_QC_PAGE_TITLE).toBe("תיק בקרת איכות");
    expect(PORTFOLIO_QC_PAGE_SUBTITLE).toContain("ליקויים");
    expect(PORTFOLIO_QC_PAGE_SUBTITLE).toContain("דירוג פרויקטים");
  });
});
