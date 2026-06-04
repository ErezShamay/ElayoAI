import { describe, expect, it } from "vitest";

import {
  buildRtlTableBody,
  mirrorTableRowsForRtl,
  PDF_DEFAULT_STYLE,
} from "@/lib/field-reports/pdf/pdf-styles";

describe("pdf-styles (RTL layout)", () => {
  it("PDF_DEFAULT_STYLE enables Hebrew direction and font", () => {
    expect(PDF_DEFAULT_STYLE.direction).toBe("rtl");
    expect(PDF_DEFAULT_STYLE.font).toBe("NotoSansHebrew");
    expect(PDF_DEFAULT_STYLE.alignment).toBe("right");
  });

  it("mirrorTableRowsForRtl reverses column order", () => {
    expect(
      mirrorTableRowsForRtl([
        ["א", "ב", "ג"],
        ["1", "2", "3"],
      ])
    ).toEqual([
      ["ג", "ב", "א"],
      ["3", "2", "1"],
    ]);
  });

  it("buildRtlTableBody places first header on the right", () => {
    const body = buildRtlTableBody(
      ["מיקום", "תיאור"],
      [["קומה 3", "סדק"]]
    );

    expect(body[0][0]).toMatchObject({
      text: "תיאור",
      style: "tableHeader",
    });
    expect(body[0][1]).toMatchObject({
      text: "מיקום",
      style: "tableHeader",
    });
    expect(body[1][0]).toMatchObject({ text: "סדק" });
    expect(body[1][1]).toMatchObject({ text: "קומה 3" });
  });
});
