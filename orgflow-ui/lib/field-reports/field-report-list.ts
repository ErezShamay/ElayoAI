/** סטטוסים שלא מוצגים ברשימת «הדוחות שלי» (לאחר שליחה לליבה). */
export const FIELD_REPORT_LIST_HIDDEN_STATUSES = new Set(["LOCKED"]);

export function isFieldReportVisibleInList(status: string): boolean {
  return !FIELD_REPORT_LIST_HIDDEN_STATUSES.has(status);
}
