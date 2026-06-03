import { describe, expect, it } from "vitest";

import {
  COLUMN_PRESETS,
  getColumnPresetHeaders,
} from "@/lib/field-reports/schema/column-presets";
import { COLUMN_PRESET_KEYS } from "@/lib/field-reports/schema/types";

describe("COLUMN_PRESETS", () => {
  it("defines all preset keys", () => {
    for (const key of COLUMN_PRESET_KEYS) {
      expect(COLUMN_PRESETS[key].length).toBeGreaterThan(0);
    }
  });

  it("matches example PDF column headers for rich findings table", () => {
    expect(getColumnPresetHeaders("rich")).toEqual([
      "מיקום",
      "מלאכה",
      "סטטוס / הערות",
      "תיאור",
      "תמונות",
    ]);
  });

  it("matches example PDF column headers for simple findings table", () => {
    expect(getColumnPresetHeaders("simple")).toEqual([
      "תיאור",
      "הערות / לטיפול",
      "תמונות",
    ]);
  });

  it("matches example PDF column headers for progress table", () => {
    expect(getColumnPresetHeaders("progress")).toEqual([
      "תיאור עבודה",
      "סטטוס",
      "תאריך ביצוע / סיום",
    ]);
  });

  it("matches example PDF column headers for structure table", () => {
    expect(getColumnPresetHeaders("structure")).toEqual([
      "תיאור",
      "סטטוס / תאריך סיום",
    ]);
  });
});
