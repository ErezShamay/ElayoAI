/**
 * Gate D→E — PDF Premium §13.3 (supervision pivot).
 * מנהל: "שולח לוועד בלי Word" — footer, branding, standard_ref, RTL markers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildFindingsTableBody,
  buildFindingsTableColumns,
  buildVisitReportDocDefinition,
} from "@/lib/field-reports/pdf/build-doc-definition";
import { formatCatalogStandardCell } from "@/lib/field-reports/pdf/format-catalog-standard-cell";
import { createPdfPrinter } from "@/lib/field-reports/pdf/font-loader";
import {
  PDF_SUPERVISION_BANNER_HE,
  renderVisitReportHeader,
} from "@/lib/field-reports/pdf/render-header";
import { renderRepeatingPageHeader } from "@/lib/field-reports/pdf/render-page-banner";

const UI_ROOT = path.resolve(__dirname, "../../..");
const FONT_PATH = path.join(
  UI_ROOT,
  "public/fonts/NotoSansHebrew-Regular.ttf"
);

function readUiSource(relativePath: string): string {
  return readFileSync(path.join(UI_ROOT, relativePath), "utf8");
}

describe("supervision PDF gate (§13.3)", () => {
  beforeAll(() => {
    const fontBytes = readFileSync(FONT_PATH);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("NotoSansHebrew")) {
          return new Response(fontBytes, { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      })
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("exposes footer page X of Y in doc definition", () => {
    const doc = buildVisitReportDocDefinition({
      report: {
        id: "gate-footer",
        visit_type: "STRUCTURE_SITE",
        visit_type_label_he: "שלד / אתר",
        visit_date: "2026-06-01",
        project_name: "פרויקט בדיקה",
        header_fields: {},
        lines: [],
        organization_profile_snapshot: {
          organization_name: "פיקוח בע״מ",
          report_tagline: "פיקוח בניה הנדסי",
          report_phone: "03-1234567",
          report_address_line: "רחוב הרצל 1",
          report_city: "תל אביב",
        },
      },
    });

    expect(typeof doc.footer).toBe("function");
    if (typeof doc.footer !== "function") {
      throw new Error("expected footer function");
    }
    const footer = doc.footer(2, 5);
    const footerText = JSON.stringify(footer);
    expect(footerText).toContain("עמוד 2 מתוך 5");
    expect(footerText).toContain("פיקוח בע״מ");
  });

  it("renders supervision banner and org branding in repeating header", () => {
    const header = renderRepeatingPageHeader({
      visitDate: "2026-06-01",
      profile: {
        organization_name: "פיקוח דוגמה",
        report_tagline: "פיקוח בניה הנדסי",
      },
    });

    const pageOne = JSON.stringify(header(1, 3));
    expect(pageOne).toContain(PDF_SUPERVISION_BANNER_HE);
    expect(pageOne).toContain("פיקוח דוגמה");
    expect(pageOne).toContain("01.06.2026");
  });

  it("renders org contact branding on cover when profile is present", () => {
    const content = renderVisitReportHeader({
      report: {
        visit_type: "STRUCTURE_SITE",
        visit_type_label_he: "שלד / אתר",
        visit_date: "2026-06-01",
        project_name: "פרויקט אורנים",
        header_fields: {},
      },
      profile: {
        organization_name: "פיקוח אורנים",
        report_tagline: "פיקוח בניה הנדסי",
        report_phone: "03-5551212",
        report_address_line: "רחוב בialik 5",
        report_city: "רמת גן",
      },
      logoDataUrl: "data:image/png;base64,logo",
    });

    const coverText = JSON.stringify(content);
    expect(coverText).toContain("פיקוח בניה הנדסי");
    expect(coverText).toContain("03-5551212");
    expect(coverText).toContain("logo");
  });

  it("includes standard_ref and catalog_reference_id in findings table", () => {
    const lines = [
      {
        id: "line-1",
        sort_order: 0,
        location: "דירה 3",
        description: "סדק בקיר",
        issue_id: "STR-CRACK-01",
        standard_ref: 'ת"י 466',
        catalog_reference_id: "IL-STD-466-CRACK",
        severity: "HIGH",
      },
    ];

    const columns = buildFindingsTableColumns(lines);
    const body = buildFindingsTableBody(lines, columns);

    expect(columns).toContain("תקן");
    expect(formatCatalogStandardCell(lines[0])).toBe(
      'ת"י 466 (IL-STD-466-CRACK)'
    );
    expect(body[0]?.join(" ")).toContain('ת"י 466 (IL-STD-466-CRACK)');
  });

  it("wires publish flow to PDF generation and archive upload", () => {
    const publishApi = readUiSource("lib/field-reports/publish-api.ts");
    const publishDialog = readUiSource(
      "components/field-reports/PublishReportDialog.tsx"
    );

    expect(publishApi).toContain("generateVisitReportPdf");
    expect(publishApi).toContain("resolvePublishPdfBlob");
    expect(publishApi).toContain("pdf_archived");
    expect(publishDialog).toContain("PDF");
    expect(publishDialog).toContain("ארכיון");
  });

  it("generates Hebrew PDF within 15s typical bar", async () => {
    const started = Date.now();
    const doc = buildVisitReportDocDefinition({
      report: {
        id: "gate-perf",
        visit_type: "STRUCTURE_SITE",
        visit_type_label_he: "שלד / אתר",
        visit_date: "2026-06-01",
        project_name: "ביצועים",
        header_fields: {},
        lines: [
          {
            id: "l1",
            sort_order: 0,
            location: "קומה 2",
            description: "בדיקת שלד",
            issue_id: "STR-1",
            standard_ref: 'ת"י 118',
            catalog_reference_id: "IL-STD-118",
          },
        ],
      },
    });

    const pdfMake = await createPdfPrinter();
    const blob = await pdfMake.createPdf(doc).getBlob();
    const elapsedMs = Date.now() - started;

    expect(blob.size).toBeGreaterThan(4_000);
    expect(elapsedMs).toBeLessThan(15_000);
  }, 20_000);
});
