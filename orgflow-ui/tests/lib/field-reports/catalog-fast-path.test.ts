import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATALOG_FAST_PATH_AUTO_CONFIRM,
  CATALOG_FAST_PATH_MAX_TAPS,
  computeCatalogPickerTapCount,
  countFastPathTapsToLine,
  fastPathMeetsGate,
  filterIssuesForSupervisionCategory,
  listSupervisionCategories,
  supervisionCategoryLabelHe,
} from "@/lib/field-reports/catalog-fast-path";

const UI_ROOT = path.resolve(__dirname, "../../..");

describe("catalog fast-path (supervision pivot stage D)", () => {
  it("maps top families to supervision category labels", () => {
    expect(supervisionCategoryLabelHe("STRUCTURAL_WORKS")).toBe("שלד");
    expect(supervisionCategoryLabelHe("FINISHING_WORKS")).toBe("גמר");
    expect(supervisionCategoryLabelHe("MECHANICAL_ELECTRICAL_SYSTEMS")).toBe(
      "מערכות"
    );
    expect(
      supervisionCategoryLabelHe("SYSTEM_WATERPROOFING_AND_INSULATION")
    ).toBe("איטום");
  });

  it("lists only families with issues for the picker", () => {
    const categories = listSupervisionCategories([
      { top_family: "STRUCTURAL_WORKS", issue_count: 8 },
      { top_family: "FINISHING_WORKS", issue_count: 0 },
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0]?.top_family).toBe("STRUCTURAL_WORKS");
  });

  it("filters issues by supervision category", () => {
    const issues = filterIssuesForSupervisionCategory(
      [
        {
          issue_id: "A",
          top_family: "STRUCTURAL_WORKS",
          category_id: "c1",
          category_name_he: "שלד",
        },
        {
          issue_id: "B",
          top_family: "FINISHING_WORKS",
          category_id: "c2",
          category_name_he: "גמר",
        },
      ],
      "STRUCTURAL_WORKS"
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.issue_id).toBe("A");
  });

  it("meets ≤3 tap gate with auto-confirm on issue select", () => {
    expect(CATALOG_FAST_PATH_AUTO_CONFIRM).toBe(true);
    expect(computeCatalogPickerTapCount()).toBe(2);
    expect(computeCatalogPickerTapCount({ autoConfirmOnIssueSelect: false })).toBe(
      3
    );

    const taps = countFastPathTapsToLine({
      categorySelected: true,
      issueSelected: true,
      confirmSelected: false,
    });

    expect(taps).toBeLessThanOrEqual(CATALOG_FAST_PATH_MAX_TAPS);
    expect(fastPathMeetsGate(taps)).toBe(true);
  });

  it("wires two-step picker with auto-confirm in CatalogIssuePicker", () => {
    const picker = readFileSync(
      path.join(UI_ROOT, "components/field-reports/CatalogIssuePicker.tsx"),
      "utf8"
    );

    expect(picker).toContain("listSupervisionCategories");
    expect(picker).toContain("CATALOG_FAST_PATH_AUTO_CONFIRM");
    expect(picker).not.toContain('title="משפחה"');
  });
});
