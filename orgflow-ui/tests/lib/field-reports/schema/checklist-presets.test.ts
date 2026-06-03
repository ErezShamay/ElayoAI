import { describe, expect, it } from "vitest";

import {
  FINISHING_CHECKLIST_ITEM_DEFS,
  defaultFinishingChecklistBlock,
  defaultFinishingChecklistItems,
} from "@/lib/field-reports/schema/checklist-presets";
import { defaultReportBlocksForVisitType } from "@/lib/field-reports/schema/block-defaults";

describe("defaultFinishingChecklistItems", () => {
  it("includes six Hagana-style checklist labels", () => {
    const items = defaultFinishingChecklistItems();

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.label_he)).toEqual(
      FINISHING_CHECKLIST_ITEM_DEFS.map((def) => def.label_he)
    );
    expect(items.every((item) => item.checked === false)).toBe(true);
  });
});

describe("defaultFinishingChecklistBlock", () => {
  it("returns a checklist block with preset items", () => {
    const block = defaultFinishingChecklistBlock();

    expect(block.kind).toBe("checklist");
    expect(block.items).toHaveLength(6);
  });
});

describe("FINISHING_APARTMENTS default blocks", () => {
  it("includes checklist between progress and findings", () => {
    const blocks = defaultReportBlocksForVisitType("FINISHING_APARTMENTS");

    expect(blocks.map((block) => block.kind)).toEqual([
      "progress_table",
      "checklist",
      "findings_table",
    ]);

    const checklist = blocks.find((block) => block.kind === "checklist");
    expect(checklist && checklist.kind === "checklist" ? checklist.items.length : 0).toBe(
      6
    );
  });
});
