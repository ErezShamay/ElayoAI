import { describe, expect, it } from "vitest";

import {
  buildDeliverableReportsQuery,
  defaultDeliverableReportRange,
} from "@/lib/deliverable-reports/date-range";

describe("deliverable reports date range", () => {
  it("builds a query with start and end dates", () => {
    expect(
      buildDeliverableReportsQuery("2026-01-01", "2026-03-31")
    ).toBe(
      "/portfolio/deliverable-reports?start_date=2026-01-01&end_date=2026-03-31"
    );
  });

  it("includes optional project filter", () => {
    expect(
      buildDeliverableReportsQuery("2026-01-01", "2026-03-31", "project-1")
    ).toContain("project_id=project-1");
  });

  it("defaults to a 90-day window", () => {
    const range = defaultDeliverableReportRange();
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.startDate <= range.endDate).toBe(true);
  });

  it("rejects an inverted date range", () => {
    expect(() =>
      buildDeliverableReportsQuery("2026-06-15", "2026-06-01")
    ).toThrow("תאריך ההתחלה חייב להיות לפני תאריך הסיום");
  });
});
