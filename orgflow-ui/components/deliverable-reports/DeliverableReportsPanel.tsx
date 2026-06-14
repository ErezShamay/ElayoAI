"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import {
  downloadFieldVisitReportPdf,
  getDeliverableReportsDashboard,
} from "@/lib/deliverable-reports/api";
import { defaultDeliverableReportRange } from "@/lib/deliverable-reports/date-range";
import {
  formatComplianceRate,
  formatDeliverablePeriod,
  type DeliverableReportType,
} from "@/lib/deliverable-reports/types";
import { hasQCPermission } from "@/lib/quality-issues/permissions";

const TYPE_FILTER_OPTIONS: Array<{
  id: "all" | DeliverableReportType;
  label: string;
}> = [
  { id: "all", label: "הכל" },
  { id: "weekly", label: "דוחות שבועיים" },
  { id: "handover_protocol", label: "פרוטוקולי מסירה" },
  { id: "annual_bedek", label: "דוחות שנת בדק" },
  { id: "home_bedek", label: "דוחות בדק בית" },
];

function formatSentDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return value;
  }
}

export default function DeliverableReportsPanel() {
  const effectiveRole = useEffectiveRole();
  const canReadPortfolio = hasQCPermission(
    effectiveRole,
    "quality_portfolio:read"
  );

  const defaults = defaultDeliverableReportRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [typeFilter, setTypeFilter] = useState<"all" | DeliverableReportType>(
    "all"
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const loadDashboard = useCallback(async () => {
    return getDeliverableReportsDashboard({
      startDate,
      endDate,
    });
  }, [endDate, startDate]);

  const {
    data: dashboard,
    loading,
    error,
    reload,
  } = useOrgQuery(
    `portfolio/deliverable-reports:${startDate}:${endDate}`,
    loadDashboard,
    {
      enabled: canReadPortfolio,
      showErrorToast: false,
    }
  );

  const filteredReports = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    if (typeFilter === "all") {
      return dashboard.reports;
    }

    return dashboard.reports.filter(
      (report) => report.report_type === typeFilter
    );
  }, [dashboard, typeFilter]);

  if (!canReadPortfolio) {
    return null;
  }

  return (
    <section className="mb-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-zinc-500">תפוקה ומדידה</p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            ארכיון דוחות פיקוח
          </h2>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            דוחות שטח שפורסמו ונשמרו כ-PDF — מוכנים לשליחה לוועד בלי Word.
            כולל מעקב דוחות שבועיים לפי פרויקט.
          </p>
        </div>
      </div>

      <div className="of-card of-card-p8 flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">מתאריך</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">עד תאריך</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <Button type="button" variant="secondary" onClick={() => void reload()}>
          רענון
        </Button>
      </div>

      {loading && !dashboard ? (
        <LoadingState message="טוען דוחות שנשלחו..." />
      ) : null}

      {error && !dashboard ? (
        <div className="of-card of-card-p8 text-sm text-red-600 dark:text-red-400">
          {error.message}
        </div>
      ) : null}

      {downloadError ? (
        <div className="of-card of-card-p8 text-sm text-red-600 dark:text-red-400">
          {downloadError}
        </div>
      ) : null}

      {dashboard ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="of-card of-card-p6">
              <p className="text-sm text-zinc-500">תקופה</p>
              <p className="mt-2 text-lg font-semibold">
                {formatDeliverablePeriod(dashboard)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {dashboard.active_project_count} פרויקטים פעילים
              </p>
            </div>
            <div className="of-card of-card-p6">
              <p className="text-sm text-zinc-500">סה״כ תפוקה</p>
              <p className="mt-2 text-3xl font-bold">
                {dashboard.total_deliverables}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                דוחות שנשלחו בטווח
              </p>
            </div>
            <div className="of-card of-card-p6">
              <p className="text-sm text-zinc-500">עמידה בדוחות שבועיים</p>
              <p className="mt-2 text-3xl font-bold">
                {formatComplianceRate(dashboard.weekly_compliance.compliance_rate)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {dashboard.weekly_compliance.total_missing} חוסרים מתוך{" "}
                {dashboard.weekly_compliance.total_expected} ציפיות
              </p>
            </div>
            <div className="of-card of-card-p6">
              <p className="text-sm text-zinc-500">פילוח לפי סוג</p>
              <ul className="mt-3 space-y-1 text-sm">
                {dashboard.by_type.map((item) => (
                  <li
                    key={item.report_type}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{item.label_he}</span>
                    <span className="font-semibold">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {dashboard.missing_weekly_reports.length > 0 ? (
            <div className="of-card of-card-p8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">חוסרים בדוחות שבועיים</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  פרויקטים פעילים שלא נשלח עבורם דוח שבועי בשבוע המצוין.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-right dark:border-zinc-700">
                      <th className="px-3 py-2 font-medium">פרויקט</th>
                      <th className="px-3 py-2 font-medium">שבוע</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.missing_weekly_reports.map((cell) => {
                      const week = dashboard.weeks.find(
                        (item) =>
                          item.iso_year === cell.iso_year
                          && item.iso_week === cell.iso_week
                      );
                      return (
                        <tr
                          key={`${cell.project_id}-${cell.iso_year}-${cell.iso_week}`}
                          className="border-b border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={`/projects/${cell.project_id}`}
                              className="text-brand hover:underline"
                            >
                              {cell.project_name || cell.project_id}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                            {week?.week_label_he
                              || `שבוע ${cell.iso_week}/${cell.iso_year}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="of-card of-card-p8 text-sm text-emerald-700 dark:text-emerald-300">
              כל הפרויקטים הפעילים קיבלו דוח שבועי בכל השבועות בטווח שנבחר.
            </div>
          )}

          <div className="of-card of-card-p8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">רשימת דוחות</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {filteredReports.length} דוחות מוצגים
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTypeFilter(option.id)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      typeFilter === option.id
                        ? "bg-brand text-white"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                אין דוחות בטווח שנבחר עבור הסינון הנוכחי.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-right dark:border-zinc-700">
                      <th className="px-3 py-2 font-medium">תאריך שליחה</th>
                      <th className="px-3 py-2 font-medium">פרויקט</th>
                      <th className="px-3 py-2 font-medium">סוג</th>
                      <th className="px-3 py-2 font-medium">כותרת</th>
                      <th className="px-3 py-2 font-medium">הורדה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr
                        key={`${report.origin}-${report.id}`}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatSentDate(report.sent_date)}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/projects/${report.project_id}`}
                            className="text-brand hover:underline"
                          >
                            {report.project_name || report.project_id}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {report.report_type_label_he}
                        </td>
                        <td className="px-3 py-2">{report.title}</td>
                        <td className="px-3 py-2">
                          {report.origin === "field_visit" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={downloadingId === report.id}
                              onClick={() => {
                                setDownloadError("");
                                setDownloadingId(report.id);
                                void downloadFieldVisitReportPdf(
                                  report.id,
                                  report.title
                                )
                                  .catch((err: unknown) => {
                                    setDownloadError(
                                      err instanceof Error
                                        ? err.message
                                        : "הורדת ה-PDF נכשלה"
                                    );
                                  })
                                  .finally(() => {
                                    setDownloadingId(null);
                                  });
                              }}
                            >
                              {downloadingId === report.id
                                ? "מוריד..."
                                : "PDF"}
                            </Button>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
