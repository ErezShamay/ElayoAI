import {
  DEFAULT_FIELD_REPORT_PING_TIMEOUT_MS,
  FIELD_REPORTS_PING_PATH,
  pingFieldReportsApi,
  type FieldReportNetworkSnapshot,
  type FieldReportPingRequest,
} from "@/lib/field-reports/sync/network-status";

export {
  DEFAULT_FIELD_REPORT_PING_TIMEOUT_MS,
  FIELD_REPORTS_PING_PATH,
  pingFieldReportsApi,
  type FieldReportNetworkSnapshot,
  type FieldReportPingRequest,
};

/** מצב מקור נתונים לדוחות שטח (§6 ב.1). */
export type FieldReportDataSourceMode =
  | "local-only"
  | "remote"
  | "hybrid";

export type FieldReportDataSourceContext = {
  /** דוח קיים ב-`reports` store (לפי `client_report_uuid`). */
  hasLocalReport?: boolean;
  /** מזהה שרת - מאפשר קריאות API במצב hybrid. */
  serverReportId?: string | null;
  /** המפקח הפעיל «הכנה לא מקוון» בכוונה. */
  offlinePrepActive?: boolean;
};

export type FieldReportDataSource = {
  mode: FieldReportDataSourceMode;
  network: FieldReportNetworkSnapshot;
  /** טעינה/שמירה מ-`reportsRepository` (שלב ב). */
  useLocalReports: boolean;
  /** קטלוג מ-IndexedDB `catalog` בלבד. */
  useLocalCatalog: boolean;
  /** PATCH/POST ל-`/field-reports/visits/*` מותר. */
  canCallVisitReportApi: boolean;
};

/**
 * קובע מצב מקור נתונים:
 * - `remote` - ברירת מחדל כשיש רשת (גם לפני ping / כשהשרת לא נגיש)
 * - `hybrid` - יש עותק מקומי + אפשרות סנכרון
 * - `local-only` - אין רשת בכלל
 */
export function resolveFieldReportDataSource(
  network: FieldReportNetworkSnapshot,
  context: FieldReportDataSourceContext = {}
): FieldReportDataSource {
  const hasLocalReport = Boolean(context.hasLocalReport);
  const hasServerReportId = Boolean(context.serverReportId);
  const offlinePrepActive = Boolean(context.offlinePrepActive);

  let mode: FieldReportDataSourceMode;
  if (!network.navigatorOnline) {
    mode = "local-only";
  } else if (hasLocalReport) {
    mode = "hybrid";
  } else {
    mode = "remote";
  }

  const useLocalReports =
    mode === "local-only" || (mode === "hybrid" && hasLocalReport);
  const useLocalCatalog =
    offlinePrepActive && !network.navigatorOnline;
  const canCallVisitReportApi =
    network.navigatorOnline
    && (
      mode === "remote"
      || (mode === "hybrid" && hasServerReportId)
    );

  return {
    mode,
    network,
    useLocalReports,
    useLocalCatalog,
    canCallVisitReportApi,
  };
}

/** תווית עברית קצרה ל-UI (באנר / מצב שמירה). */
export function fieldReportDataSourceModeLabelHe(
  mode: FieldReportDataSourceMode
): string {
  switch (mode) {
    case "local-only":
      return "אופליין - נתונים מקומיים";
    case "hybrid":
      return "מקומי + סנכרון לשרת";
    case "remote":
      return "מקוון - שרת";
  }
}
