import { describe, expect, it } from "vitest";

import {
  PROJECT_SCHEME_OPTIONS,
  projectSchemeLabelHe,
} from "@/lib/field-reports/project-scheme-labels";

describe("projectSchemeLabelHe", () => {
  it("maps TAMA schemes to a Hebrew PDF line", () => {
    for (const option of PROJECT_SCHEME_OPTIONS) {
      if (option.value === "NEW_CONSTRUCTION") {
        continue;
      }
      expect(projectSchemeLabelHe(option.value)).toBe(
        `התחדשות עירונית - פרויקט ${option.label} תמ"א`
      );
    }
  });

  it("maps NEW_CONSTRUCTION to a standalone label", () => {
    expect(projectSchemeLabelHe("NEW_CONSTRUCTION")).toBe("בנייה חדשה");
  });

  it("includes NEW_CONSTRUCTION in project setup options", () => {
    const values = PROJECT_SCHEME_OPTIONS.map((option) => option.value);
    expect(values).toContain("NEW_CONSTRUCTION");
  });
});
