import { describe, expect, it } from "vitest";

import {
  applyWinterSeasonToBlocks,
  buildFixedTextBlocksForNewReport,
  isWinterSeasonDate,
  resolveFixedTextBlocksFromHeader,
  resolveIncludeFixedTextBlocks,
} from "@/lib/field-reports/schema/fixed-text-inject";
import { DEFAULT_NON_CONFORMANCE_DISCLAIMER_HE } from "@/lib/field-reports/schema/block-defaults";

describe("isWinterSeasonDate", () => {
  it("returns true for October through March", () => {
    expect(isWinterSeasonDate("2026-10-15")).toBe(true);
    expect(isWinterSeasonDate("2026-01-01")).toBe(true);
    expect(isWinterSeasonDate("2026-03-31")).toBe(true);
  });

  it("returns false for April through September", () => {
    expect(isWinterSeasonDate("2026-06-01")).toBe(false);
    expect(isWinterSeasonDate("2026-04-01")).toBe(false);
  });
});

describe("buildFixedTextBlocksForNewReport", () => {
  it("includes disclaimers and enables winter in winter season", () => {
    const blocks = buildFixedTextBlocksForNewReport({ visitDate: "2026-11-01" });

    expect(blocks[0].body_he).toBe(DEFAULT_NON_CONFORMANCE_DISCLAIMER_HE);
    expect(blocks[0].enabled).toBe(true);
    const winter = blocks.find((block) => block.kind === "winter_recommendations");
    expect(winter?.enabled).toBe(true);
  });

  it("disables winter outside winter season", () => {
    const blocks = buildFixedTextBlocksForNewReport({ visitDate: "2026-06-01" });
    const winter = blocks.find((block) => block.kind === "winter_recommendations");
    expect(winter?.enabled).toBe(false);
  });
});

describe("applyWinterSeasonToBlocks", () => {
  it("toggles winter block only", () => {
    const blocks = buildFixedTextBlocksForNewReport();
    const updated = applyWinterSeasonToBlocks(blocks, "2026-12-01");
    const winter = updated.find((block) => block.kind === "winter_recommendations");
    expect(winter?.enabled).toBe(true);
    expect(updated[0].enabled).toBe(true);
  });
});

describe("resolveFixedTextBlocksFromHeader", () => {
  it("reads structured blocks from header_fields", () => {
    const blocks = resolveFixedTextBlocksFromHeader({
      fixed_text_blocks: [
        {
          id: "a",
          kind: "safety_disclaimer",
          body_he: "בטיחות",
          enabled: true,
        },
      ],
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("safety_disclaimer");
  });

  it("respects include_fixed_text_blocks flag", () => {
    expect(
      resolveIncludeFixedTextBlocks(
        { include_fixed_text_blocks: false, fixed_text_blocks: [] },
        []
      )
    ).toBe(false);
    expect(resolveIncludeFixedTextBlocks({}, [])).toBe(false);
    expect(
      resolveIncludeFixedTextBlocks(
        { fixed_text_blocks: [{ id: "a", kind: "custom", body_he: "x", enabled: true }] },
        [{ id: "a", kind: "custom", body_he: "x", enabled: true }]
      )
    ).toBe(true);
  });
});
