import {
  normalizeConstructionProgressRows,
  serializeConstructionProgressRows,
  type ConstructionProgressRow,
} from "./construction-progress";
import {
  DEFAULT_CONTRACTOR_NOTES_HE,
  DEFAULT_PROJECT_UPDATES_HE,
  DEFAULT_WINTER_RECOMMENDATIONS_HE,
} from "./pdf-block-defaults";

export type ReportHeaderFields = {
  site_address: string;
  developer_name: string;
  developer_pm_name: string;
  lawyer_name: string;
  accompanying_lawyer: string;
  contractor_name: string;
  project_updates: string[];
  winter_recommendations: string;
  contractor_notes: string[];
  inspector_title: string;
  inspector_license: string;
  construction_progress: ConstructionProgressRow[];
};

export function normalizeHeaderFields(
  fields: Record<string, unknown>,
  visitType = "STRUCTURE_SITE"
): ReportHeaderFields {
  return {
    site_address: stringField(fields.site_address),
    developer_name: stringField(fields.developer_name),
    developer_pm_name: stringField(
      fields.developer_pm_name ?? fields.contractor_name
    ),
    lawyer_name: stringField(fields.lawyer_name),
    accompanying_lawyer: stringField(fields.accompanying_lawyer),
    contractor_name: stringField(fields.contractor_name),
    project_updates: stringListField(
      fields.project_updates,
      DEFAULT_PROJECT_UPDATES_HE
    ),
    winter_recommendations: stringField(
      fields.winter_recommendations,
      DEFAULT_WINTER_RECOMMENDATIONS_HE
    ),
    contractor_notes: stringListField(
      fields.contractor_notes,
      DEFAULT_CONTRACTOR_NOTES_HE
    ),
    inspector_title: stringField(fields.inspector_title),
    inspector_license: stringField(fields.inspector_license),
    construction_progress: normalizeConstructionProgressRows(
      fields.construction_progress,
      visitType
    ),
  };
}

export function serializeHeaderFieldsForApi(
  fields: ReportHeaderFields
): Record<string, unknown> {
  return {
    site_address: fields.site_address || null,
    developer_name: fields.developer_name || null,
    developer_pm_name: fields.developer_pm_name || null,
    lawyer_name: fields.lawyer_name || null,
    accompanying_lawyer: fields.accompanying_lawyer || null,
    contractor_name: fields.contractor_name || null,
    project_updates: cleanStringList(fields.project_updates),
    winter_recommendations: fields.winter_recommendations.trim(),
    contractor_notes: cleanStringList(fields.contractor_notes),
    inspector_title: fields.inspector_title || null,
    inspector_license: fields.inspector_license || null,
    construction_progress: serializeConstructionProgressRows(
      fields.construction_progress
    ),
  };
}

export function cleanStringList(values: string[]): string[] {
  return values.map((item) => item.trim()).filter(Boolean);
}

function stringField(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function stringListField(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return value.map((item) => String(item));
}
