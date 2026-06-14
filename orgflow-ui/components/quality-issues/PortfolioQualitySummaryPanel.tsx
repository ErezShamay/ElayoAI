"use client";

import { useCallback } from "react";

import LoadingState from "@/components/ui/LoadingState";
import { useEffectiveRole } from "@/hooks/useEffectiveRole";
import { useOrgQuery } from "@/hooks/useOrgQuery";
import { getPortfolioQualitySummary } from "@/lib/quality-issues/api";
import {
  formatLastReportAtCaption,
  formatLastReportAtKpi,
  formatOpenIssuesPerProjectCaption,
} from "@/lib/quality-issues/portfolio-summary";
import { hasQCPermission } from "@/lib/quality-issues/permissions";

export default function PortfolioQualitySummaryPanel() {
  const effectiveRole = useEffectiveRole();
  const canReadPortfolio = hasQCPermission(
    effectiveRole,
    "quality_portfolio:read"
  );

  const loadSummary = useCallback(async () => {
    return getPortfolioQualitySummary();
  }, []);

  const { data: summary, loading, error } = useOrgQuery(
    "portfolio/quality-summary",
    loadSummary,
    {
      enabled: canReadPortfolio,
      showErrorToast: false,
    }
  );

  if (!canReadPortfolio) {
    return null;
  }

  if (loading && !summary) {
    return (
      <section className="mb-10">
        <LoadingState message="טוען סיכום תיק פיקוח..." />
      </section>
    );
  }

  if (error && !summary) {
    return (
      <section className="of-card of-card-p8 mb-10 text-sm text-red-600 dark:text-red-400">
        {error.message}
      </section>
    );
  }

  if (!summary) {
    return null;
  }

  const projectCaption = formatOpenIssuesPerProjectCaption(summary.projects);
  const lastReportCaption = formatLastReportAtCaption(summary.last_report_at);

  return (
    <section className="mb-10 space-y-6">
      <div className="space-y-1">
        <p className="text-zinc-500">תיק פיקוח</p>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          תיק פיקוח הנדסי — ליקויים שפורסמו
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {projectCaption}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {lastReportCaption}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SupervisionKpiCard
          title="ליקויים פתוחים"
          value={summary.total_open}
        />
        <SupervisionKpiCard
          title="קריטיים פתוחים"
          value={summary.total_open_critical}
          danger={summary.total_open_critical > 0}
        />
        <SupervisionKpiCard
          title="דוח אחרון"
          value={formatLastReportAtKpi(summary.last_report_at)}
          text
        />
      </div>
    </section>
  );
}

function SupervisionKpiCard({
  title,
  value,
  danger = false,
  text = false,
}: {
  title: string;
  value: number | string;
  danger?: boolean;
  text?: boolean;
}) {
  const borderClass = danger ? "border-red-200 dark:border-red-900" : "";
  const titleClass = danger ? "text-red-500" : "text-zinc-500";
  const valueClass = danger ? "text-red-600" : "";

  return (
    <div className={`of-kpi-card ${borderClass}`}>
      <p className={`mb-3 ${titleClass}`}>
        {title}
      </p>
      <p
        className={`font-black ${text ? "text-3xl" : "text-5xl"} ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
