import { describe, expect, it } from "vitest";

import {
  buildGroupKey,
  buildGroupLabelHe,
  lineGroupFieldsFromSelection,
  parseGroupKey,
} from "@/lib/field-reports/line-grouping";

describe("line-grouping", () => {
  it("builds apartment and floor keys with Hebrew labels", () => {
    expect(
      lineGroupFieldsFromSelection({ kind: "apartment", value: "3" })
    ).toEqual({
      group_key: "apartment:3",
      group_label_he: "דירה 3",
    });

    expect(lineGroupFieldsFromSelection({ kind: "floor", value: "2" })).toEqual(
      {
        group_key: "floor:2",
        group_label_he: "קומה 2",
      }
    );
  });

  it("returns null group fields when kind is none or value empty", () => {
    expect(
      lineGroupFieldsFromSelection({ kind: "none", value: "" })
    ).toEqual({
      group_key: null,
      group_label_he: null,
    });

    expect(
      lineGroupFieldsFromSelection({ kind: "apartment", value: "  " })
    ).toEqual({
      group_key: null,
      group_label_he: null,
    });
  });

  it("parses stored group_key back to selection", () => {
    expect(parseGroupKey("apartment:12")).toEqual({
      kind: "apartment",
      value: "12",
    });
    expect(parseGroupKey("area:מרפסות")).toEqual({
      kind: "area",
      value: "מרפסות",
    });
    expect(parseGroupKey(null)).toEqual({ kind: "none", value: "" });
  });

  it("prefixes area labels when missing", () => {
    expect(buildGroupLabelHe({ kind: "area", value: "חדרים רטובים" })).toBe(
      "אזור חדרים רטובים"
    );
    expect(buildGroupKey({ kind: "area", value: "אזור מרפסות" })).toBe(
      "area:אזור מרפסות"
    );
  });
});
