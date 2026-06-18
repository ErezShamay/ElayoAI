import type {
  FieldReportDocumentType,
  InspectMode,
  SupervisionReportMeta,
} from "@/lib/field-reports/schema/types";

/** מיפוי UI מהיר → סטטוס פנימי (enum קיים — לא משנים). */
export const QUICK_INSPECT_STATUS_MAP = {
  ok: "OK",
  defect: "DEFECT",
  untouched: "UNCHECKED",
  notApplicable: "NOT_APPLICABLE",
} as const;

type SupervisionMetaSource =
  | SupervisionReportMeta
  | Record<string, unknown>
  | null
  | undefined;

function asSupervisionMetaRecord(
  source: SupervisionMetaSource | unknown
): Record<string, unknown> | null {
  if (!source || typeof source !== "object") {
    return null;
  }
  return source as Record<string, unknown>;
}

function readDocumentType(
  source: SupervisionMetaSource | unknown
): FieldReportDocumentType {
  const raw = asSupervisionMetaRecord(source)?.document_type;
  return raw === "handover_protocol" ? "handover_protocol" : "weekly_inspection";
}

function readInspectMode(source: SupervisionMetaSource | unknown): InspectMode | null {
  const raw = asSupervisionMetaRecord(source)?.inspect_mode;
  return raw === "standard" || raw === "quick" ? raw : null;
}

/** weekly_inspection → quick; handover_protocol → standard; explicit meta wins. */
export function resolveInspectMode(
  source: SupervisionMetaSource | unknown
): InspectMode {
  const explicit = readInspectMode(source);
  if (explicit) {
    return explicit;
  }

  return readDocumentType(source) === "weekly_inspection" ? "quick" : "standard";
}

export function defaultInspectModeForDocumentType(
  documentType: FieldReportDocumentType
): InspectMode {
  return documentType === "weekly_inspection" ? "quick" : "standard";
}
