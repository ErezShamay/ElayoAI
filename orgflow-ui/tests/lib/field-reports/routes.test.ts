import { afterEach, describe, expect, it, vi } from "vitest";

import { CAPACITOR_STATIC_EXPORT_PLACEHOLDER_ID } from "@/lib/capacitor/build-mode";
import {
  fieldReportDetailPath,
  resolveFieldReportRouteId,
} from "@/lib/field-reports/routes";

const REPORT_UUID = "a1111111-1111-4111-8111-111111111111";

vi.mock("@/lib/capacitor/platform", () => ({
  isCapacitorNativePlatform: vi.fn(() => false),
}));

describe("field report routes", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("fieldReportDetailPath uses id segment on web", async () => {
    const { isCapacitorNativePlatform } = await import(
      "@/lib/capacitor/platform"
    );
    vi.mocked(isCapacitorNativePlatform).mockReturnValue(false);

    expect(fieldReportDetailPath(REPORT_UUID)).toBe(
      `/field-reports/${REPORT_UUID}`
    );
  });

  it("fieldReportDetailPath uses placeholder + query on native", async () => {
    const { isCapacitorNativePlatform } = await import(
      "@/lib/capacitor/platform"
    );
    vi.mocked(isCapacitorNativePlatform).mockReturnValue(true);

    expect(fieldReportDetailPath(REPORT_UUID)).toBe(
      `/field-reports/${CAPACITOR_STATIC_EXPORT_PLACEHOLDER_ID}/?report=${encodeURIComponent(REPORT_UUID)}`
    );
  });

  it("resolveFieldReportRouteId reads report query on placeholder", () => {
    const params = new URLSearchParams({ report: REPORT_UUID });

    expect(
      resolveFieldReportRouteId(
        CAPACITOR_STATIC_EXPORT_PLACEHOLDER_ID,
        params
      )
    ).toBe(REPORT_UUID);
  });

  it("resolveFieldReportRouteId returns param id when not placeholder", () => {
    expect(resolveFieldReportRouteId(REPORT_UUID, null)).toBe(REPORT_UUID);
  });
});
