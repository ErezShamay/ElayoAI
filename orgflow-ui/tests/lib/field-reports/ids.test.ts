import { describe, expect, it } from "vitest";

import {
  createClientLineUuid,
  createClientReportUuid,
  isClientUuid,
} from "@/lib/field-reports/ids";

describe("field-reports ids", () => {
  it("createClientReportUuid returns a valid UUID v4", () => {
    const id = createClientReportUuid();
    expect(isClientUuid(id)).toBe(true);
  });

  it("createClientLineUuid returns distinct values", () => {
    const first = createClientLineUuid();
    const second = createClientLineUuid();

    expect(isClientUuid(first)).toBe(true);
    expect(isClientUuid(second)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("isClientUuid rejects invalid values", () => {
    expect(isClientUuid("not-a-uuid")).toBe(false);
    expect(isClientUuid("")).toBe(false);
    expect(isClientUuid(null)).toBe(false);
    expect(isClientUuid("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
  });
});
