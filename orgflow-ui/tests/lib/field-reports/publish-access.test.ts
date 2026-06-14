import { describe, expect, it } from "vitest";

import {
  canPublishFieldReports,
  PUBLISH_REPORT_CTA_LABEL,
} from "@/lib/field-reports/publish-access";
import {
  fieldReportListStatusLabel,
  isFieldReportPendingPublish,
} from "@/lib/field-reports/publish-list";

describe("field report publish access", () => {
  it("allows ADMIN, MANAGER, and PLATFORM_ADMIN to publish", () => {
    expect(canPublishFieldReports("ADMIN")).toBe(true);
    expect(canPublishFieldReports("MANAGER")).toBe(true);
    expect(canPublishFieldReports("PLATFORM_ADMIN")).toBe(true);
  });

  it("denies SUPERVISOR and VIEWER publish", () => {
    expect(canPublishFieldReports("SUPERVISOR")).toBe(false);
    expect(canPublishFieldReports("VIEWER")).toBe(false);
    expect(canPublishFieldReports("RESIDENT")).toBe(false);
  });

  it("uses locked publish CTA label from spec", () => {
    expect(PUBLISH_REPORT_CTA_LABEL).toBe("אשר ופרסם לפורטל");
  });
});

describe("field report publish list helpers", () => {
  it("detects pending publish from API flags", () => {
    expect(
      isFieldReportPendingPublish({
        status: "CLOSED",
        pending_publish: true,
        can_publish: true,
        is_published: false,
      })
    ).toBe(true);

    expect(
      isFieldReportPendingPublish({
        status: "CLOSED",
        pending_publish: false,
        can_publish: false,
        is_published: true,
      })
    ).toBe(false);
  });

  it("labels closed reports waiting for publish", () => {
    expect(
      fieldReportListStatusLabel({
        status: "CLOSED",
        status_label_he: "סגור",
        pending_publish: true,
        is_published: false,
      })
    ).toBe("ממתין לפרסום");

    expect(
      fieldReportListStatusLabel({
        status: "CLOSED",
        status_label_he: "סגור",
        pending_publish: false,
        is_published: true,
      })
    ).toBe("פורסם לפורטל");
  });
});
