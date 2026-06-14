import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_SUPERVISION_PAGE_SUBTITLE,
  PORTFOLIO_SUPERVISION_PAGE_TITLE,
} from "@/lib/quality-issues/portfolio-page";

describe("portfolio supervision page copy", () => {
  it("uses supervision portfolio title and subtitle", () => {
    expect(PORTFOLIO_SUPERVISION_PAGE_TITLE).toBe("תיק פיקוח הנדסי");
    expect(PORTFOLIO_SUPERVISION_PAGE_SUBTITLE).toContain("ליקויים");
    expect(PORTFOLIO_SUPERVISION_PAGE_SUBTITLE).toContain("פרויקטים");
  });
});
