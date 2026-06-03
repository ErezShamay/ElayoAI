import { describe, expect, it } from "vitest";

import {
  PDF_DEFAULT_ADDRESSEE_HE,
  PDF_REPORT_TITLE_HE,
  PDF_SUPERVISION_BANNER_HE,
  renderVisitReportHeader,
} from "@/lib/field-reports/pdf/render-header";

describe("renderVisitReportHeader", () => {
  it("renders client-style titles, scheme, addressee and project dates", () => {
    const content = renderVisitReportHeader({
      report: {
        visit_type: "STRUCTURE_SITE",
        visit_type_label_he: "שלד / אתר",
        visit_date: "2026-06-01",
        project_name: "פרויקט אורנים",
        header_fields: {
          scheme: "TAMA38_STRENGTHENING",
          scheme_label_he:
            'התחדשות עירונית - פרויקט חיזוק תמ"א',
          project_start_date: "2024-01-01",
          project_end_date: "2027-12-31",
          housing_units_count: 42,
          developer_name: "יזם בע״מ",
          lawyer_name: "עו״ד כהן",
          site_address: "רחוב הרצל 1",
          project_updates: ["עדכון לפרויקט"],
        },
      },
    });

    const texts = collectContentTexts(content);
    expect(texts).toContain(PDF_SUPERVISION_BANNER_HE);
    expect(texts).toContain(PDF_REPORT_TITLE_HE);
    expect(texts).toContain('התחדשות עירונית - פרויקט חיזוק תמ"א');
    expect(texts).toContain(`לכבוד: ${PDF_DEFAULT_ADDRESSEE_HE}`);
    expect(texts).toContain("תאריך התחלת פרויקט: 2024-01-01");
    expect(texts).toContain("מספר יחידות דיור: 42");
    expect(texts).toContain("יזם: יזם בע״מ");
    expect(texts).toContain("עו״ד ב״כ דיירים: עו״ד כהן");
    expect(texts).toContain("כתובת אתר: רחוב הרצל 1");
    expect(texts).toContain("עדכונים לפרויקט");
    expect(texts).toContain("עדכון לפרויקט");
  });

  it("falls back to legacy header fields when metadata is missing", () => {
    const content = renderVisitReportHeader({
      report: {
        visit_type: "STRUCTURE_SITE",
        visit_type_label_he: "שלד / אתר",
        visit_date: "2026-06-01",
        project_name: "בדיקה",
        header_fields: {
          developer_name: "Legacy Dev",
          developer_pm_name: "Legacy PM",
          lawyer_name: "Legacy Lawyer",
          site_address: "Legacy Site",
        },
      },
    });

    const texts = collectContentTexts(content);
    expect(texts).toContain("יזם: Legacy Dev");
    expect(texts).toContain("מנהל פרויקט מטעם יזם: Legacy PM");
    expect(texts).toContain("עו״ד ב״כ דיירים: Legacy Lawyer");
    expect(texts).toContain("כתובת אתר: Legacy Site");
    expect(texts).not.toContain("תאריך התחלת פרויקט:");
  });

  it("renders stakeholders from explicit array with role labels", () => {
    const content = renderVisitReportHeader({
      report: {
        visit_type: "FINISHING_APARTMENTS",
        visit_type_label_he: "גמר",
        visit_date: "2026-06-01",
        project_name: "ההגנה",
        header_fields: {
          stakeholders: [
            {
              id: "arch-1",
              role: "architect",
              name: "אדריכלית לוי",
            },
            {
              id: "cont-1",
              role: "contractor",
              name: "קבלן א'",
            },
          ],
          main_suppliers: [
            {
              id: "s1",
              category_he: "מטבחים",
              vendor_name: "איקאה",
            },
          ],
        },
      },
    });

    const texts = collectContentTexts(content);
    expect(texts).toContain("אדריכל הפרויקט: אדריכלית לוי");
    expect(texts).toContain("קבלן מבצע: קבלן א'");
    expect(texts).toContain("ספקים עיקריים");
    expect(texts).toContain("מטבחים: איקאה");
  });
});

function collectContentTexts(content: unknown): string[] {
  if (!content) {
    return [];
  }

  if (typeof content === "string") {
    return [content];
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => collectContentTexts(item));
  }

  if (typeof content === "object") {
    const node = content as Record<string, unknown>;
    const texts: string[] = [];

    if (typeof node.text === "string") {
      texts.push(node.text);
    }

    for (const key of ["stack", "ul", "ol", "columns", "content"]) {
      if (key in node) {
        texts.push(...collectContentTexts(node[key]));
      }
    }

    return texts;
  }

  return [];
}
