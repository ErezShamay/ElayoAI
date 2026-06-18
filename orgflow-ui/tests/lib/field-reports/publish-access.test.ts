import { describe, expect, it } from "vitest";

import {
  canFinalizeFieldReports,
  canPublishFieldReports,
} from "@/lib/field-reports/publish-access";
import {
  fieldReportListStatusLabel,
  isFieldReportPendingPublish,
} from "@/lib/field-reports/publish-list";

describe("field report finalize access", () => {
  it("allows SUPERVISOR only to finalize", () => {
    expect(canFinalizeFieldReports("SUPERVISOR")).toBe(true);
    expect(canFinalizeFieldReports("MANAGER")).toBe(false);
    expect(canFinalizeFieldReports("ADMIN")).toBe(false);
    expect(canFinalizeFieldReports("VIEWER")).toBe(false);
  });

  it("removes legacy manager publish access", () => {
    expect(canPublishFieldReports("ADMIN")).toBe(false);
    expect(canPublishFieldReports("MANAGER")).toBe(false);
    expect(canPublishFieldReports("SUPERVISOR")).toBe(false);
  });
});

describe("field report list helpers", () => {
  it("detects closed reports waiting for PDF finalize", () => {
    expect(
      isFieldReportPendingPublish({
        status: "CLOSED",
        pending_publish: false,
        can_publish: false,
        is_published: false,
      })
    ).toBe(true);

    expect(
      isFieldReportPendingPublish({
        status: "FINALIZED",
        pending_publish: false,
        can_publish: false,
        is_published: true,
      })
    ).toBe(false);
  });

  it("labels finalize pipeline states", () => {
    expect(
      fieldReportListStatusLabel({
        status: "FINALIZING",
        status_label_he: "סגור",
        pending_publish: false,
        is_published: false,
      })
    ).toBe("מעבד...");

    expect(
      fieldReportListStatusLabel({
        status: "FINALIZED",
        status_label_he: "סגור",
        pending_publish: false,
        is_published: true,
      })
    ).toBe("נשלח בהצלחה");
  });
});
