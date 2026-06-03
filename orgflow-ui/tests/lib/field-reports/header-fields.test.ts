import { describe, expect, it } from "vitest";

import {
  normalizeHeaderFields,
  patchHeaderFieldsBlocks,
  patchHeaderFieldsConstructionProgress,
  patchHeaderFieldsFixedTextBlocks,
  patchHeaderFieldsStakeholders,
  serializeHeaderFieldsForApi,
} from "@/lib/field-reports/header-fields";
import { buildFixedTextBlocksForNewReport } from "@/lib/field-reports/schema/fixed-text-inject";
import {
  createEmptyBlockForKind,
  findProgressTableBlock,
} from "@/lib/field-reports/schema/blocks-storage";

describe("normalizeHeaderFields", () => {
  it("normalizes legacy-only header_fields without error", () => {
    const fields = normalizeHeaderFields({
      site_address: "רחוב 1",
      developer_name: "יזם בע״מ",
      developer_pm_name: "דני",
      lawyer_name: "עו״ד כהן",
      project_updates: ["עדכון 1"],
      winter_recommendations: "המלצות",
      contractor_notes: [],
      construction_progress: [],
    });

    expect(fields.site_address).toBe("רחוב 1");
    expect(fields.developer_name).toBe("יזם בע״מ");
    expect(fields.stakeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "developer", name: "יזם בע״מ" }),
        expect.objectContaining({ role: "project_manager", name: "דני" }),
        expect.objectContaining({ role: "lawyer_tenants", name: "עו״ד כהן" }),
      ])
    );
    expect(fields.project_metadata.site_address).toBe("רחוב 1");
  });

  it("prefers explicit stakeholders when legacy fields also exist", () => {
    const fields = normalizeHeaderFields({
      developer_name: "Legacy יזם",
      stakeholders: [
        {
          id: "dev-1",
          role: "developer",
          name: "יזם מפורש",
        },
      ],
    });

    expect(fields.developer_name).toBe("Legacy יזם");
    expect(fields.stakeholders).toEqual([
      expect.objectContaining({ id: "dev-1", name: "יזם מפורש" }),
    ]);
  });

  it("loads nested project_metadata and main_suppliers", () => {
    const fields = normalizeHeaderFields({
      site_address: "כתובת ישנה",
      project_metadata: {
        site_address: "כתובת חדשה",
        scheme: "TAMA38_STRENGTHENING",
        housing_units_count: 42,
      },
      main_suppliers: [
        { id: "s1", category_he: "אינסטלציה", vendor_name: "ספק א" },
      ],
    });

    expect(fields.site_address).toBe("כתובת ישנה");
    expect(fields.project_metadata.scheme).toBe("TAMA38_STRENGTHENING");
    expect(fields.project_metadata.housing_units_count).toBe(42);
    expect(fields.main_suppliers).toHaveLength(1);
  });
});

describe("serializeHeaderFieldsForApi", () => {
  it("includes legacy keys and new structured keys", () => {
    const fields = normalizeHeaderFields({
      developer_name: "יזם",
      lawyer_name: "עו״ד",
    });

    const payload = serializeHeaderFieldsForApi(fields);

    expect(payload.developer_name).toBe("יזם");
    expect(payload.lawyer_name).toBe("עו״ד");
    expect(payload.stakeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "developer", name: "יזם" }),
        expect.objectContaining({ role: "lawyer_tenants", name: "עו״ד" }),
      ])
    );
    expect(payload.project_metadata).toBeDefined();
  });

  it("patchHeaderFieldsConstructionProgress syncs progress block rows", () => {
    const fields = normalizeHeaderFields({}, "STRUCTURE_SITE");
    const patched = patchHeaderFieldsConstructionProgress(
      fields,
      [
        {
          description: "חפירה",
          status: "בוצע",
          completion_date: "2026-03-01",
        },
      ],
      "STRUCTURE_SITE"
    );

    expect(patched.construction_progress[0]?.description).toBe("חפירה");
    const progressBlock = findProgressTableBlock(patched.blocks);
    expect(progressBlock?.rows[0]?.description).toBe("חפירה");
  });

  it("patchHeaderFieldsStakeholders syncs legacy developer_name", () => {
    const fields = normalizeHeaderFields({
      developer_name: "יזם ישן",
    });

    const patched = patchHeaderFieldsStakeholders(
      fields,
      {
        stakeholders: [
          {
            id: "dev-1",
            role: "developer",
            name: "יזם מעודכן",
            label_he: "יזם",
          },
        ],
      },
      "STRUCTURE_SITE"
    );

    expect(patched.developer_name).toBe("יזם מעודכן");
    expect(patched.stakeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "developer", name: "יזם מעודכן" }),
      ])
    );
  });

  it("syncs legacy edits into stakeholders on serialize", () => {
    const fields = normalizeHeaderFields({
      developer_name: "יזם ישן",
    });

    fields.developer_name = "יזם מעודכן";

    const payload = serializeHeaderFieldsForApi(fields);

    expect(payload.developer_name).toBe("יזם מעודכן");
    expect(payload.stakeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "developer", name: "יזם מעודכן" }),
      ])
    );
  });

  it("round-trips legacy report shape", () => {
    const raw = {
      site_address: "אתר",
      developer_name: "יזם",
      developer_pm_name: "מנהל",
      contractor_name: "קבלן",
      lawyer_name: "עו״ד דיירים",
      accompanying_lawyer: "עו״ד מלווה",
      project_updates: ["עדכון"],
      winter_recommendations: "חורף",
      contractor_notes: ["הערה"],
      inspector_title: "מפקח",
      inspector_license: "123",
      construction_progress: [
        {
          description: "עבודה",
          status: "בוצע",
          completion_date: "2026-01-01",
        },
      ],
    };

    const normalized = normalizeHeaderFields(raw, "STRUCTURE_SITE");
    const serialized = serializeHeaderFieldsForApi(normalized);
    const again = normalizeHeaderFields(serialized, "STRUCTURE_SITE");

    expect(again.site_address).toBe("אתר");
    expect(again.developer_name).toBe("יזם");
    expect(again.developer_pm_name).toBe("מנהל");
    expect(again.contractor_name).toBe("קבלן");
    expect(again.construction_progress).toHaveLength(1);
    expect(again.stakeholders.length).toBeGreaterThanOrEqual(4);
  });
});

describe("patchHeaderFieldsBlocks", () => {
  it("syncs construction_progress when progress block rows change", () => {
    const base = normalizeHeaderFields(
      { construction_progress: [] },
      "STRUCTURE_SITE"
    );

    const progressBlock = findProgressTableBlock(base.blocks);
    expect(progressBlock).not.toBeNull();

    const extra = createEmptyBlockForKind("free_text", "STRUCTURE_SITE", {
      title_he: "הערות",
    });

    const updated = patchHeaderFieldsBlocks(
      base,
      [
        {
          ...progressBlock!,
          rows: [
            {
              id: "row-1",
              description: "דיפון",
              status: "בוצע",
              completion_date: "2026-02-01",
            },
          ],
        },
        extra,
      ],
      "STRUCTURE_SITE"
    );

    expect(updated.blocks).toHaveLength(2);
    expect(updated.construction_progress).toEqual([
      {
        description: "דיפון",
        status: "בוצע",
        completion_date: "2026-02-01",
      },
    ]);

    const payload = serializeHeaderFieldsForApi(updated);
    expect(Array.isArray(payload.blocks)).toBe(true);
    expect((payload.blocks as unknown[]).length).toBe(2);
  });

  it("serializes fixed_text_blocks for API (FR-4.2)", () => {
    const blocks = buildFixedTextBlocksForNewReport({ visitDate: "2026-12-01" });
    const fields = patchHeaderFieldsFixedTextBlocks(
      normalizeHeaderFields({}, "STRUCTURE_SITE"),
      { fixed_text_blocks: blocks, include_fixed_text_blocks: true },
      "STRUCTURE_SITE",
      "2026-12-01"
    );

    const payload = serializeHeaderFieldsForApi(fields);
    expect(payload.include_fixed_text_blocks).toBe(true);
    expect(Array.isArray(payload.fixed_text_blocks)).toBe(true);
    expect(
      (payload.fixed_text_blocks as { kind: string }[]).some(
        (block) => block.kind === "winter_recommendations"
      )
    ).toBe(true);
  });
});
