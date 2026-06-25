import { describe, expect, it } from "vitest";

import {
  DATE_RANGE_START_AFTER_END_MESSAGE,
  PROJECT_GRACE_BEFORE_END_MESSAGE,
  PROJECT_START_AFTER_END_MESSAGE,
  extractProjectDatesFromHeaderFields,
  validateDateRange,
  validateProjectDates,
} from "@/lib/validation/project-dates";

describe("validateProjectDates", () => {
  it("accepts a valid project timeline", () => {
    expect(
      validateProjectDates({
        project_start_date: "2026-01-01",
        project_end_date: "2028-06-01",
        project_grace_end_date: "2028-12-01",
      })
    ).toBeNull();
  });

  it("rejects start on or after end", () => {
    expect(
      validateProjectDates({
        project_start_date: "2028-06-01",
        project_end_date: "2026-01-01",
      })
    ).toBe(PROJECT_START_AFTER_END_MESSAGE);
  });

  it("rejects grace on or before end", () => {
    expect(
      validateProjectDates({
        project_end_date: "2028-06-01",
        project_grace_end_date: "2028-01-01",
      })
    ).toBe(PROJECT_GRACE_BEFORE_END_MESSAGE);
  });
});

describe("validateDateRange", () => {
  it("rejects an inverted reporting range", () => {
    expect(validateDateRange("2026-06-15", "2026-06-01")).toBe(
      DATE_RANGE_START_AFTER_END_MESSAGE
    );
  });
});

describe("extractProjectDatesFromHeaderFields", () => {
  it("reads nested project metadata", () => {
    expect(
      extractProjectDatesFromHeaderFields({
        project_metadata: {
          project_start_date: "2026-01-01",
          project_end_date: "2028-06-01",
          project_grace_end_date: "2028-12-01",
        },
      })
    ).toEqual({
      project_start_date: "2026-01-01",
      project_end_date: "2028-06-01",
      project_grace_end_date: "2028-12-01",
    });
  });
});
