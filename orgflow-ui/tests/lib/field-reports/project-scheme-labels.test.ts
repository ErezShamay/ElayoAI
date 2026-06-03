import { describe, expect, it } from "vitest";

import {
  PROJECT_SCHEME_OPTIONS,
  projectSchemeLabelHe,
} from "@/lib/field-reports/project-scheme-labels";

describe("projectSchemeLabelHe", () => {
  it("maps each scheme to a Hebrew PDF line", () => {
    for (const option of PROJECT_SCHEME_OPTIONS) {
      expect(projectSchemeLabelHe(option.value)).toBe(
        `התחדשות עירונית - פרויקט ${option.label} תמ"א`
      );
    }
  });
});
