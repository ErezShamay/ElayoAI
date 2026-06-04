/** השהיית auto-save לדוחות מקומיים (§6 ב.5). */
export const FIELD_REPORT_LOCAL_AUTOSAVE_MS = 400;

/** השהיית auto-save לעדכוני כותרת מול שרת. */
export const FIELD_REPORT_REMOTE_AUTOSAVE_MS = 900;

export function fieldReportHeaderAutosaveDelayMs(
  useLocalReports: boolean
): number {
  return useLocalReports
    ? FIELD_REPORT_LOCAL_AUTOSAVE_MS
    : FIELD_REPORT_REMOTE_AUTOSAVE_MS;
}
