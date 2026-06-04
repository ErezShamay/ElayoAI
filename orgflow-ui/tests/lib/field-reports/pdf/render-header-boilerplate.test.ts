import { describe, expect, it } from "vitest";

import {
  buildCoverNumberedEntries,
  isCoverNumberedFixedTextKind,
} from "@/lib/field-reports/pdf/render-header-boilerplate";
import {
  DEFAULT_NON_CONFORMANCE_DISCLAIMER_HE,
  DEFAULT_SAFETY_DISCLAIMER_HE,
} from "@/lib/field-reports/schema/block-defaults";

describe("render-header-boilerplate", () => {
  it("marks disclaimer kinds as cover-only", () => {
    expect(isCoverNumberedFixedTextKind("non_conformance_disclaimer")).toBe(
      true
    );
    expect(isCoverNumberedFixedTextKind("winter_recommendations")).toBe(
      false
    );
  });

  it("orders project updates before default disclaimers", () => {
    const entries = buildCoverNumberedEntries({
      project_updates: ["עדכון א"],
      fixed_text_blocks: [],
      include_fixed_text_blocks: true,
    });

    expect(entries[0]).toBe("עדכון א");
    expect(entries[1]).toBe(DEFAULT_NON_CONFORMANCE_DISCLAIMER_HE);
    expect(entries[2]).toBe(DEFAULT_SAFETY_DISCLAIMER_HE);
  });
});
