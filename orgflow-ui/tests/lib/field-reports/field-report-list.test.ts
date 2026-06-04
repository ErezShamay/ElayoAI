import { describe, expect, it } from "vitest";

import { isFieldReportVisibleInList } from "@/lib/field-reports/field-report-list";

describe("field-report-list", () => {
  it("hides LOCKED reports sent to core", () => {
    expect(isFieldReportVisibleInList("LOCKED")).toBe(false);
  });

  it("shows active workflow statuses", () => {
    expect(isFieldReportVisibleInList("IN_PROGRESS")).toBe(true);
    expect(isFieldReportVisibleInList("CLOSED")).toBe(true);
    expect(isFieldReportVisibleInList("PENDING_UPLOAD")).toBe(true);
  });
});
