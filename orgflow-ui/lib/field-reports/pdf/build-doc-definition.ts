import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  constructionProgressTitleHe,
  type ConstructionProgressRow,
} from "../construction-progress";
import { DEFAULT_WINTER_RECOMMENDATIONS_HE } from "../pdf-block-defaults";
import type {
  OrganizationProfileSnapshot,
  PdfReportLine,
  VisitReportPdfInput,
} from "./types";

const FONT = "NotoSansHebrew";
const PAGE_MARGIN: [number, number, number, number] = [
  40, 80, 40, 60,
];

const LINE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "בתהליך",
  DONE: "בוצע",
  NEEDS_ACTION: "יש להשלים",
};

export function formatOrgAddress(
  profile: OrganizationProfileSnapshot | null | undefined
): string {
  const parts = [
    profile?.report_address_line,
    profile?.report_city,
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatHeaderContact(
  profile: OrganizationProfileSnapshot | null | undefined
): string {
  return [
    profile?.report_phone,
    formatOrgAddress(profile),
    profile?.report_tagline,
  ]
    .filter(Boolean)
    .join("  |  ");
}

export function buildFindingsTableColumns(
  lines: PdfReportLine[]
): string[] {
  const hasCatalogLines = lines.some((line) => Boolean(line.issue_id));
  const columns = ["מיקום", "מלאכה", "סטטוס / הערות", "תיאור"];
  if (hasCatalogLines) {
    columns.push("תקן", "חומרה");
  }
  return columns;
}

export function buildFindingsTableBody(
  lines: PdfReportLine[],
  columns: string[]
): string[][] {
  const includeStandard = columns.includes("תקן");

  return [...lines]
    .sort(
      (left, right) =>
        (left.sort_order ?? 0) - (right.sort_order ?? 0)
    )
    .map((line) => {
      const statusNotes = [
        line.status ? formatLineStatus(line.status) : "",
        line.notes || "",
      ]
        .filter(Boolean)
        .join(" — ");

      const row = [
        line.location || "",
        line.trade || "",
        statusNotes,
        line.description || "",
      ];

      if (includeStandard) {
        row.push(line.issue_id ? line.standard_ref || "" : "");
        row.push(line.issue_id ? line.severity || "" : "");
      }

      return row;
    });
}

export function resolveWinterRecommendationsText(
  headerFields: Record<string, unknown>
): string {
  const value = headerFields.winter_recommendations;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return DEFAULT_WINTER_RECOMMENDATIONS_HE;
}

export function resolveStringList(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function resolveConstructionProgressRows(
  headerFields: Record<string, unknown>
): ConstructionProgressRow[] {
  const raw = headerFields.construction_progress;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => normalizeConstructionProgressRow(item))
    .filter(
      (row) =>
        row.description || row.status || row.completion_date
    );
}

export function buildConstructionProgressTableBody(
  rows: ConstructionProgressRow[]
): string[][] {
  return rows.map((row) => [
    row.description,
    row.status,
    row.completion_date,
  ]);
}

export function buildPdfFilename(report: VisitReportPdfInput["report"]): string {
  const project = sanitizeFilename(report.project_name || "דוח-ביקור");
  const date = report.visit_date || "ללא-תאריך";
  return `דוח-מפקח-${project}-${date}.pdf`;
}

export function buildVisitReportDocDefinition(
  input: VisitReportPdfInput
): TDocumentDefinitions {
  const {
    report,
    inspector,
    linePhotos = [],
    logoDataUrl,
    generatedAt = new Date(),
  } = input;
  const profile = report.organization_profile_snapshot;
  const headerFields = report.header_fields || {};
  const orgName = profile?.organization_name || "ארגון";
  const tableColumns = buildFindingsTableColumns(report.lines);
  const tableBody = buildFindingsTableBody(report.lines, tableColumns);
  const generatedLabel = generatedAt.toLocaleDateString("he-IL");
  const projectUpdates = resolveStringList(headerFields.project_updates);
  const contractorNotes = resolveStringList(headerFields.contractor_notes);
  const winterRecommendations = resolveWinterRecommendationsText(
    headerFields
  );
  const developerPmName =
    stringField(headerFields.developer_pm_name)
    || stringField(headerFields.contractor_name);
  const inspectorTitle =
    stringField(headerFields.inspector_title)
    || inspector?.professional_title
    || "";
  const inspectorLicense =
    stringField(headerFields.inspector_license)
    || inspector?.license_number
    || "";

  const content: Content[] = [];

  if (logoDataUrl) {
    content.push({
      image: logoDataUrl,
      width: 80,
      alignment: "right",
      margin: [0, 0, 0, 8],
    });
  }

  content.push(
    {
      text: formatHeaderContact(profile),
      style: "headerBar",
      alignment: "right",
    },
    {
      text: "דוח מפקח הנדסי לדיירים",
      style: "reportTitle",
      alignment: "center",
      margin: [0, 12, 0, 4],
    },
    {
      text: report.visit_type_label_he,
      style: "subTitle",
      alignment: "center",
      margin: [0, 0, 0, 12],
    },
    {
      columns: [
        {
          width: "*",
          stack: [
            {
              text: `תאריך ביקור: ${report.visit_date}`,
              alignment: "right",
            },
            {
              text: `פרויקט: ${report.project_name || ""}`,
              alignment: "right",
            },
          ],
        },
      ],
    },
    {
      text: "פרטים כלליים",
      style: "sectionTitle",
      margin: [0, 16, 0, 6],
    },
    {
      ul: [
        `יזם: ${stringField(headerFields.developer_name)}`,
        `מנהל פרויקט מטעם יזם: ${developerPmName}`,
        `עו״ד ב״כ דיירים: ${stringField(headerFields.lawyer_name)}`,
        `עו״ד מלווה: ${stringField(headerFields.accompanying_lawyer)}`,
        `כתובת אתר: ${stringField(headerFields.site_address)}`,
      ],
      alignment: "right",
      margin: [0, 0, 0, 8],
    }
  );

  if (projectUpdates.length) {
    content.push({
      text: "עדכונים לפרויקט",
      style: "sectionTitle",
      margin: [0, 8, 0, 4],
    });
    content.push({
      ol: projectUpdates.map((item) => String(item)),
      alignment: "right",
      margin: [0, 0, 0, 8],
    });
  }

  const progressRows = resolveConstructionProgressRows(headerFields);
  if (progressRows.length) {
    const progressTitle = constructionProgressTitleHe(report.visit_type);
    content.push({
      text: progressTitle,
      style: "sectionTitle",
      margin: [0, 12, 0, 6],
    });
    content.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto"],
        body: [
          ["תיאור עבודה", "סטטוס", "תאריך ביצוע / סיום"],
          ...buildConstructionProgressTableBody(progressRows),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    });
  }

  content.push({
    text: "ממצאים / עבודות",
    style: "sectionTitle",
    margin: [0, 12, 0, 6],
  });

  if (tableBody.length) {
    content.push({
      table: {
        headerRows: 1,
        widths: tableColumns.map(() => "*"),
        body: [tableColumns, ...tableBody],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    });
  } else {
    content.push({
      text: "אין שורות ממצאים בדוח.",
      alignment: "right",
      margin: [0, 0, 0, 12],
    });
  }

  content.push({
    text: "המלצות חורף / עונת גשמים",
    style: "sectionTitle",
    margin: [0, 12, 0, 6],
  });
  content.push({
    text: winterRecommendations,
    alignment: "right",
    margin: [0, 0, 0, 12],
  });

  if (contractorNotes.length) {
    content.push({
      text: "הערות נוספות לקבלן",
      style: "sectionTitle",
      margin: [0, 0, 0, 4],
    });
    content.push({
      ol: contractorNotes,
      alignment: "right",
      margin: [0, 0, 0, 12],
    });
  }

  for (const photo of linePhotos) {
    content.push({
      text: `תמונה — שורה ${photo.lineId.slice(0, 8)}`,
      style: "photoCaption",
      alignment: "right",
      margin: [0, 8, 0, 4],
    });
    content.push({
      image: photo.dataUrl,
      width: 220,
      alignment: "right",
      margin: [0, 0, 0, 8],
    });
  }

  content.push({
    text: "חתימה",
    style: "sectionTitle",
    margin: [0, 16, 0, 6],
  });
  const signatureLines = [
    inspector?.full_name || "מפקח",
    inspectorTitle,
    inspectorLicense
      ? `מספר רישוי: ${inspectorLicense}`
      : "",
    orgName,
  ].filter((line) => line && line !== "—");

  content.push({
    stack: signatureLines.map((line) => ({
      text: line,
      alignment: "right",
    })),
    margin: [0, 0, 0, 12],
  });

  return {
    info: {
      title: buildPdfFilename(report),
    },
    pageMargins: PAGE_MARGIN,
    defaultStyle: {
      font: FONT,
      fontSize: 10,
      alignment: "right",
    },
    styles: {
      headerBar: {
        fontSize: 8,
        color: "#444444",
      },
      reportTitle: {
        fontSize: 16,
        bold: true,
      },
      subTitle: {
        fontSize: 12,
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
      },
      photoCaption: {
        fontSize: 9,
        color: "#555555",
      },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `${generatedLabel} · ${orgName}`,
          alignment: "right",
          fontSize: 8,
          margin: [40, 0, 0, 0],
        },
        {
          text: `עמוד ${currentPage} מתוך ${pageCount}`,
          alignment: "left",
          fontSize: 8,
          margin: [0, 0, 40, 0],
        },
      ],
    }),
    content,
  };
}

function stringField(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const text = String(value).trim();
  return text || "—";
}

function formatLineStatus(status: string): string {
  return LINE_STATUS_LABELS[status] || status;
}

function normalizeConstructionProgressRow(
  value: unknown
): ConstructionProgressRow {
  if (!value || typeof value !== "object") {
    return { description: "", status: "", completion_date: "" };
  }

  const row = value as Record<string, unknown>;
  return {
    description: progressField(row.description),
    status: progressField(row.status),
    completion_date: progressField(row.completion_date),
  };
}

function progressField(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w\u0590-\u05FF.-]+/g, "-").replace(/-+/g, "-");
}
