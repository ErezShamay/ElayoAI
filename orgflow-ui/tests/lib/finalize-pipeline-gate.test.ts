/**
 * Gate F6 — Finalize Pipeline frontend wiring.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  canFinalizeFieldReports,
  canPublishFieldReports,
} from "@/lib/field-reports/publish-access";
import {
  isVisitReportFinalizeComplete,
  isVisitReportFinalizeFailed,
  isVisitReportFinalizing,
  visitReportPipelineStatusLabel,
} from "@/lib/field-reports/finalize-status-labels";

const UI_ROOT = path.resolve(__dirname, "../..");

function readUiSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

describe("finalize pipeline gate (F6)", () => {
  it("allows only SUPERVISOR to finalize", () => {
    expect(canFinalizeFieldReports("SUPERVISOR")).toBe(true);
    expect(canFinalizeFieldReports("MANAGER")).toBe(false);
    expect(canFinalizeFieldReports("ADMIN")).toBe(false);
    expect(canFinalizeFieldReports("VIEWER")).toBe(false);
  });

  it("removes manager publish access from UI", () => {
    expect(canPublishFieldReports("MANAGER")).toBe(false);
    expect(canPublishFieldReports("ADMIN")).toBe(false);
  });

  it("wires PDF generation to POST /finalize", () => {
    const finalizeApi = readUiSource("lib/field-reports/finalize-api.ts");
    const pdfButton = readUiSource(
      "components/field-reports/GenerateVisitReportPdfButton.tsx"
    );
    const syncManager = readUiSource(
      "lib/field-reports/sync/sync-manager.ts"
    );

    expect(finalizeApi).toContain("/field-reports/visits/${reportId}/finalize");
    expect(finalizeApi).toContain("finalizeVisitReport");
    expect(pdfButton).toContain("finalizeVisitReport");
    expect(syncManager).toContain("finalizeVisitReport");
    expect(syncManager).toContain('setPhase("finalize")');
  });

  it("does not expose send-to-core or manager publish CTAs in report UI", () => {
    const page = readUiSource("app/(dashboard)/field-reports/[id]/page.tsx");
    const primaryActions = readUiSource(
      "components/field-reports/VisitReportPrimaryActions.tsx"
    );

    expect(page).not.toContain("אשר ופרסם");
    expect(page).not.toContain("PublishReportDialog");
    expect(page).not.toContain("SendToCoreDialog");
    expect(page).not.toContain("שלח לליבה");
    expect(primaryActions).not.toContain("שלח לליבה");
    expect(primaryActions).not.toContain("can_send_to_core");
  });

  it("shows pipeline status labels for FINALIZING / FINALIZED / FAILED", () => {
    expect(
      visitReportPipelineStatusLabel({
        status: "FINALIZING",
        status_label_he: "סגור",
      })
    ).toBe("מעבד...");

    expect(
      visitReportPipelineStatusLabel({
        status: "FINALIZED",
        status_label_he: "סגור",
        is_published: true,
      })
    ).toBe("נשלח בהצלחה");

    expect(
      visitReportPipelineStatusLabel({
        status: "FINALIZE_FAILED",
        status_label_he: "סגור",
      })
    ).toBe("שגיאה בעיבוד");

    expect(isVisitReportFinalizing("FINALIZING")).toBe(true);
    expect(isVisitReportFinalizeComplete("FINALIZED")).toBe(true);
    expect(isVisitReportFinalizeFailed("FINALIZE_FAILED")).toBe(true);
  });

  it("renders pipeline messaging in PDF actions", () => {
    const pdfActions = readUiSource(
      "components/field-reports/VisitReportPdfActions.tsx"
    );

    expect(pdfActions).toContain("FINALIZING");
    expect(pdfActions).toContain("FINALIZED");
    expect(pdfActions).toContain("FINALIZE_FAILED");
    expect(pdfActions).toContain("מעלה ומעבד דוח");
  });
});
