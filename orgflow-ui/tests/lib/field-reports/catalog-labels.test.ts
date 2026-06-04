import { describe, expect, it } from "vitest";

import {
  catalogFamilyLabelHe,
  catalogSeverityLabelHe,
} from "@/lib/field-reports/catalog-labels";

describe("catalog-labels", () => {
  it("maps top_family codes to Hebrew", () => {
    expect(catalogFamilyLabelHe("STRUCTURAL_WORKS")).toBe(
      "שלד, קונסטרוקציה ובטון"
    );
    expect(catalogFamilyLabelHe("FINISHING_WORKS", null)).toBe(
      "עבודות גמר ופנים"
    );
  });

  it("prefers known mapping over raw English code in label_he", () => {
    expect(catalogFamilyLabelHe("STRUCTURAL_WORKS", "STRUCTURAL_WORKS")).toBe(
      "שלד, קונסטרוקציה ובטון"
    );
  });

  it("maps severity values to Hebrew", () => {
    expect(catalogSeverityLabelHe("High")).toBe("גבוה");
    expect(catalogSeverityLabelHe("critical")).toBe("קריטי");
    expect(catalogSeverityLabelHe("Medium")).toBe("בינוני");
    expect(catalogSeverityLabelHe("Low")).toBe("נמוך");
  });

  it("returns empty string for missing severity", () => {
    expect(catalogSeverityLabelHe(null)).toBe("");
    expect(catalogSeverityLabelHe("   ")).toBe("");
  });
});
