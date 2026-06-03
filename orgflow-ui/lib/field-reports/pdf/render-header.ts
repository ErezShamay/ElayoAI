import type { Content } from "pdfmake/interfaces";

import { normalizeHeaderFields } from "../header-fields";
import { projectSchemeLabelHe } from "../project-scheme-labels";
import { stakeholderRoleLabelHe } from "../stakeholder-role-labels";
import type { ProjectMetadata, Stakeholder, StakeholderRole } from "../schema/types";
import type { OrganizationProfileSnapshot, PdfVisitReport } from "./types";

/** כותרת עליונה כמו בדוחות הלקוח (7/7). */
export const PDF_SUPERVISION_BANNER_HE =
  "פיקוח בניה הנדסי מטעם הדיירים";

/** כותרת דוח ראשית — דוחות דוגמה. */
export const PDF_REPORT_TITLE_HE =
  "דוח מפקח/ת הנדסי מטעם בעלי הדירות";

/** נמען ברירת מחדל כשאין addressee_label_he. */
export const PDF_DEFAULT_ADDRESSEE_HE = "בעלי הקרקע / בעלי הדירות";

/** סדר תצוגת stakeholders בכותרת PDF. */
const STAKEHOLDER_RENDER_ORDER: readonly StakeholderRole[] = [
  "developer",
  "project_manager",
  "site_manager",
  "contractor",
  "lawyer_tenants",
  "lawyer_accompanying",
  "architect",
];

export type RenderVisitReportHeaderInput = {
  report: Pick<
    PdfVisitReport,
    | "visit_type"
    | "visit_type_label_he"
    | "visit_date"
    | "project_name"
    | "header_fields"
  >;
  profile?: OrganizationProfileSnapshot | null;
  logoDataUrl?: string | null;
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

/**
 * מרender את בלוק הכותרת ב-PDF — metadata, stakeholders, עדכוני פרויקט (FR-1.4).
 * גוף הדוח (ממצאים, blocks) נשאר ב-build-doc-definition.
 */
export function renderVisitReportHeader(
  input: RenderVisitReportHeaderInput
): Content[] {
  const { report, profile, logoDataUrl } = input;
  const headerFields = report.header_fields || {};
  const normalized = normalizeHeaderFields(headerFields, report.visit_type);
  const metadata = normalized.project_metadata;
  const schemeLine = resolveSchemeLabelHe(metadata, headerFields);
  const addressee = resolveAddresseeLabel(metadata, headerFields);
  const projectUpdates = resolveStringList(headerFields.project_updates);

  const content: Content[] = [];

  if (logoDataUrl) {
    content.push({
      image: logoDataUrl,
      width: 80,
      alignment: "right",
      margin: [0, 0, 0, 8],
    });
  }

  const contactLine = formatHeaderContact(profile);
  if (contactLine) {
    content.push({
      text: contactLine,
      style: "headerBar",
      alignment: "right",
    });
  }

  content.push(
    {
      text: PDF_SUPERVISION_BANNER_HE,
      style: "supervisionBanner",
      alignment: "center",
      margin: [0, 8, 0, 4],
    },
    {
      text: PDF_REPORT_TITLE_HE,
      style: "reportTitle",
      alignment: "center",
      margin: [0, 0, 0, 4],
    }
  );

  if (schemeLine) {
    content.push({
      text: schemeLine,
      style: "subTitle",
      alignment: "center",
      margin: [0, 0, 0, 4],
    });
  }

  content.push({
    text: report.visit_type_label_he,
    style: "subTitle",
    alignment: "center",
    margin: [0, 0, 0, 8],
  });

  content.push({
    text: `לכבוד: ${addressee}`,
    alignment: "right",
    margin: [0, 0, 0, 8],
  });

  content.push({
    columns: [
      {
        width: "*",
        stack: buildVisitContextLines(report),
      },
    ],
  });

  const metadataLines = buildProjectMetadataLines(metadata, headerFields);
  if (metadataLines.length) {
    content.push({
      ul: metadataLines,
      alignment: "right",
      margin: [0, 8, 0, 8],
    });
  }

  const stakeholderLines = buildStakeholderLines(normalized.stakeholders, normalized);
  content.push({
    text: "פרטים כלליים",
    style: "sectionTitle",
    margin: [0, 8, 0, 6],
  });
  content.push({
    ul: stakeholderLines,
    alignment: "right",
    margin: [0, 0, 0, 8],
  });

  const supplierLines = buildSupplierLines(normalized.main_suppliers);
  if (supplierLines.length) {
    content.push({
      text: "ספקים עיקריים",
      style: "sectionTitle",
      margin: [0, 4, 0, 4],
    });
    content.push({
      ul: supplierLines,
      alignment: "right",
      margin: [0, 0, 0, 8],
    });
  }

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

  return content;
}

/** סגנונות pdfmake לכותרת — merge ל-buildVisitReportDocDefinition. */
export const PDF_HEADER_STYLES = {
  headerBar: {
    fontSize: 8,
    color: "#444444",
  },
  supervisionBanner: {
    fontSize: 11,
    bold: true,
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
} as const;

function buildVisitContextLines(
  report: Pick<PdfVisitReport, "visit_date" | "project_name">
): Content[] {
  return [
    {
      text: `תאריך ביקור: ${report.visit_date}`,
      alignment: "right",
    },
    {
      text: `פרויקט: ${report.project_name || ""}`,
      alignment: "right",
    },
  ];
}

function buildProjectMetadataLines(
  metadata: ProjectMetadata,
  headerFields: Record<string, unknown>
): string[] {
  const lines: string[] = [];

  const startDate =
    stringField(metadata.project_start_date) ||
    stringField(headerFields.project_start_date);
  const endDate =
    stringField(metadata.project_end_date) ||
    stringField(headerFields.project_end_date);
  const graceDate =
    stringField(metadata.project_grace_end_date) ||
    stringField(headerFields.project_grace_end_date);

  if (startDate) {
    lines.push(`תאריך התחלת פרויקט: ${startDate}`);
  }
  if (endDate) {
    lines.push(`תאריך סיום פרויקט: ${endDate}`);
  }
  if (graceDate) {
    lines.push(`תאריך גרייס: ${graceDate}`);
  }

  const housingUnits =
    metadata.housing_units_count ??
    parseOptionalNumber(headerFields.housing_units_count);
  if (housingUnits !== null) {
    lines.push(`מספר יחידות דיור: ${housingUnits}`);
  }

  const structureDocDate =
    stringField(metadata.structure_documentation_date) ||
    stringField(headerFields.structure_documentation_date);
  if (structureDocDate) {
    lines.push(`תיעוד המבנה מיום: ${structureDocDate}`);
  }

  const ganttForecast =
    stringField(metadata.gantt_forecast) ||
    stringField(headerFields.gantt_forecast);
  if (ganttForecast) {
    lines.push(`צפי לוחות זמנים (גנט): ${ganttForecast}`);
  }

  const tenantChanges =
    stringField(metadata.tenant_changes_notes) ||
    stringField(headerFields.tenant_changes_notes);
  if (tenantChanges) {
    lines.push(`שינויי דיירים: ${tenantChanges}`);
  }

  return lines;
}

function buildStakeholderLines(
  stakeholders: Stakeholder[],
  normalized: ReturnType<typeof normalizeHeaderFields>
): string[] {
  const byRole = new Map(stakeholders.map((item) => [item.role, item]));
  const lines: string[] = [];

  for (const role of STAKEHOLDER_RENDER_ORDER) {
    const stakeholder = byRole.get(role);
    const name = stakeholder?.name?.trim();
    if (!name) {
      continue;
    }
    const label =
      stakeholder?.label_he?.trim() || stakeholderRoleLabelHe(role);
    lines.push(`${label}: ${name}`);
  }

  const siteAddress = normalized.site_address.trim();
  if (siteAddress) {
    lines.push(`כתובת אתר: ${siteAddress}`);
  }

  if (lines.length) {
    return lines;
  }

  return buildLegacyStakeholderFallback(normalized);
}

function buildLegacyStakeholderFallback(
  normalized: ReturnType<typeof normalizeHeaderFields>
): string[] {
  const developerPmName =
    normalized.developer_pm_name.trim() || normalized.contractor_name.trim();

  return [
    `יזם: ${displayValue(normalized.developer_name)}`,
    `מנהל פרויקט מטעם יזם: ${displayValue(developerPmName)}`,
    `עו״ד ב״כ דיירים: ${displayValue(normalized.lawyer_name)}`,
    `עו״ד מלווה: ${displayValue(normalized.accompanying_lawyer)}`,
    `כתובת אתר: ${displayValue(normalized.site_address)}`,
  ];
}

function buildSupplierLines(
  suppliers: ReturnType<typeof normalizeHeaderFields>["main_suppliers"]
): string[] {
  return suppliers
    .map((row) => {
      const category = row.category_he.trim();
      const vendor = row.vendor_name.trim();
      if (!category && !vendor) {
        return "";
      }
      if (category && vendor) {
        return `${category}: ${vendor}`;
      }
      return category || vendor;
    })
    .filter(Boolean);
}

function resolveSchemeLabelHe(
  metadata: ProjectMetadata,
  headerFields: Record<string, unknown>
): string {
  const explicit =
    stringField(metadata.scheme_label_he) ||
    stringField(headerFields.scheme_label_he);
  if (explicit) {
    return explicit;
  }

  const scheme = metadata.scheme ?? headerFields.scheme;
  if (
    scheme === "TAMA38_STRENGTHENING" ||
    scheme === "TAMA38_DEMOLITION_REBUILD" ||
    scheme === "TAMA38_RELOCATED_BUILD"
  ) {
    return projectSchemeLabelHe(scheme);
  }

  return "";
}

function resolveAddresseeLabel(
  metadata: ProjectMetadata,
  headerFields: Record<string, unknown>
): string {
  return (
    stringField(metadata.addressee_label_he) ||
    stringField(headerFields.addressee_label_he) ||
    PDF_DEFAULT_ADDRESSEE_HE
  );
}

export function resolveStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function stringField(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function displayValue(value: string): string {
  const text = value.trim();
  return text || "—";
}
