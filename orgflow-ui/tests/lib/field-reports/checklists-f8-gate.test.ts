/**
 * Gate F8 — checklists (§20 FIELD-REPORT-FINALIZE-PIPELINE).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DOCUMENT_WIZARD_KINDS,
  HANDOVER_PROTOCOL_WIZARD_ENABLED,
  documentTypeFromWizardKind,
  documentWizardKindEnabled,
  visitScopeFromDocumentWizardKind,
} from "@/lib/field-reports/document-wizard";
import { VISIT_SCOPES } from "@/lib/field-reports/schema/types";

const UI_ROOT = path.resolve(__dirname, "../../..");
const REPO_ROOT = path.resolve(UI_ROOT, "..");

function readUiSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

function readRepoSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("field report checklists gate (F8)", () => {
  it("FIELD-REPORT-CHECKLISTS.md exists with locked acceptance", () => {
    const docPath = path.join(REPO_ROOT, "docs/FIELD-REPORT-CHECKLISTS.md");
    expect(existsSync(docPath)).toBe(true);

    const body = readFileSync(docPath, "utf8");
    expect(body).toContain("מסמך צ'קליסטים נעול");
    expect(body).toContain("HANDOVER");
    expect(body).toContain("weekly_inspection");
  });

  it("defines HANDOVER scope and disabled handover wizard flag", () => {
    expect(VISIT_SCOPES).toContain("HANDOVER");
    expect(HANDOVER_PROTOCOL_WIZARD_ENABLED).toBe(false);
    expect(documentWizardKindEnabled("HANDOVER_PROTOCOL")).toBe(false);
    expect(documentWizardKindEnabled("WEEKLY_APARTMENT")).toBe(true);
  });

  it("maps weekly wizard kinds to visit scope and document type", () => {
    expect(visitScopeFromDocumentWizardKind("WEEKLY_APARTMENT")).toBe(
      "APARTMENT"
    );
    expect(visitScopeFromDocumentWizardKind("WEEKLY_PUBLIC_AREA")).toBe(
      "PUBLIC_AREA"
    );
    expect(visitScopeFromDocumentWizardKind("HANDOVER_PROTOCOL")).toBeNull();
    expect(documentTypeFromWizardKind("WEEKLY_APARTMENT")).toBe(
      "weekly_inspection"
    );
    expect(documentTypeFromWizardKind("HANDOVER_PROTOCOL")).toBe(
      "handover_protocol"
    );
    expect(DOCUMENT_WIZARD_KINDS).toHaveLength(3);
  });

  it("wizard §3.3–3.4 uses DocumentKindPicker with handover disabled", () => {
    const page = readUiSource(
      "app/(dashboard)/projects/[id]/field-reports/new/page.tsx"
    );
    const picker = readUiSource(
      "components/field-reports/supervision/DocumentKindPicker.tsx"
    );

    expect(page).toContain("DocumentKindPicker");
    expect(page).toContain("ConstructionStagePicker");
    expect(page).toContain("ApartmentPicker");
    expect(page).toContain("PublicAreaPicker");
    expect(page).not.toContain("VisitScopePicker");
    const wizard = readUiSource("lib/field-reports/document-wizard.ts");
    expect(wizard).toContain("HANDOVER_PROTOCOL");
    expect(picker).toContain("disabled={!enabled}");
    expect(picker).toContain("בקרוב");
  });

  it("supervision_meta includes document_type on create", () => {
    const helper = readUiSource("lib/field-reports/supervision-new-report.ts");
    expect(helper).toContain("document_type");
    expect(helper).toContain("documentType");
  });

  it("backend field_report_checklists schema defines HANDOVER scope", () => {
    const schema = readRepoSource("app/schemas/field_report_checklists.py");
    expect(schema).toContain("VISIT_SCOPE_HANDOVER");
    expect(schema).toContain('"HANDOVER"');
    expect(schema).toContain("HANDOVER_PROTOCOL_WIZARD_ENABLED: bool = False");
  });
});
