import { describe, expect, it } from "vitest";

import { normalizeHeaderFields } from "@/lib/field-reports/header-fields";
import {
  applyProjectPrefillToHeaderFields,
  headerNeedsProjectPrefill,
  projectMetadataFromProject,
} from "@/lib/field-reports/project-header-prefill";

describe("projectMetadataFromProject", () => {
  it("maps scheme, city, architect and dates", () => {
    const metadata = projectMetadataFromProject({
      scheme: "TAMA38_DEMOLITION_REBUILD",
      city: "רעננה",
      architect_name: "ליאת דנקנר",
      project_start_date: "2024-01-01",
      housing_units_count: 29,
    });

    expect(metadata.scheme).toBe("TAMA38_DEMOLITION_REBUILD");
    expect(metadata.scheme_label_he).toContain("הריסה ובניה");
    expect(metadata.site_address).toBe("רעננה");
    expect(metadata.architect_name).toBe("ליאת דנקנר");
    expect(metadata.housing_units_count).toBe(29);
  });
});

describe("applyProjectPrefillToHeaderFields", () => {
  it("fills empty header from project without overriding explicit values", () => {
    const empty = normalizeHeaderFields({}, "STRUCTURE_SITE", {
      visitDate: "2026-06-01",
    });

    const filled = applyProjectPrefillToHeaderFields(empty, {
      scheme: "TAMA38_DEMOLITION_REBUILD",
      city: "רעננה",
      developer_name: "יזם א",
      developer_pm_name: "מנהל",
      contractor_name: "קבלן",
      lawyer_name: "עו״ד",
      architect_name: "אדריכל",
    });

    expect(filled.developer_name).toBe("יזם א");
    expect(filled.project_metadata.scheme).toBe("TAMA38_DEMOLITION_REBUILD");
    expect(filled.stakeholders.some((s) => s.role === "architect")).toBe(true);

    const withLawyer = applyProjectPrefillToHeaderFields(
      {
        ...filled,
        lawyer_name: "עו״ד קיים",
        stakeholders: [
          {
            id: "s1",
            role: "lawyer_tenants",
            name: "עו״ד קיים",
            label_he: "עו״ד ב״כ דיירים",
          },
        ],
      },
      { lawyer_name: "עו״ד אחר", developer_name: "יזם חדש" }
    );

    expect(withLawyer.lawyer_name).toBe("עו״ד קיים");
    expect(withLawyer.developer_name).toBe("יזם א");
  });
});

describe("headerNeedsProjectPrefill", () => {
  it("returns true for empty header and false after prefill", () => {
    const empty = normalizeHeaderFields({}, "STRUCTURE_SITE");
    expect(headerNeedsProjectPrefill(empty)).toBe(true);

    const filled = applyProjectPrefillToHeaderFields(empty, {
      developer_name: "יזם",
    });
    expect(headerNeedsProjectPrefill(filled)).toBe(false);
  });
});
