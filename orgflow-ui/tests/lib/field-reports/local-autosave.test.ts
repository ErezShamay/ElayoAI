import { describe, expect, it } from "vitest";

import {
  FIELD_REPORT_LOCAL_AUTOSAVE_MS,
  FIELD_REPORT_REMOTE_AUTOSAVE_MS,
  fieldReportHeaderAutosaveDelayMs,
} from "@/lib/field-reports/local-autosave";

describe("local-autosave (FR-015)", () => {
  it("uses 400ms for local reports and 900ms for remote", () => {
    expect(FIELD_REPORT_LOCAL_AUTOSAVE_MS).toBe(400);
    expect(FIELD_REPORT_REMOTE_AUTOSAVE_MS).toBe(900);
    expect(fieldReportHeaderAutosaveDelayMs(true)).toBe(400);
    expect(fieldReportHeaderAutosaveDelayMs(false)).toBe(900);
  });
});
