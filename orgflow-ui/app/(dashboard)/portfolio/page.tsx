"use client";

import Link from "next/link";

import PortfolioPeriodicReportExport from "@/components/quality-issues/PortfolioPeriodicReportExport";
import PortfolioProjectRanking from "@/components/quality-issues/PortfolioProjectRanking";
import PortfolioQualitySummaryPanel from "@/components/quality-issues/PortfolioQualitySummaryPanel";
import PortfolioRecurringRankingsPanel from "@/components/quality-issues/PortfolioRecurringRankingsPanel";
import PortfolioTradeHeatmapPanel from "@/components/quality-issues/PortfolioTradeHeatmapPanel";
import {
  PORTFOLIO_SUPERVISION_PAGE_EYEBROW,
  PORTFOLIO_SUPERVISION_PAGE_SUBTITLE,
  PORTFOLIO_SUPERVISION_PAGE_TITLE,
} from "@/lib/quality-issues/portfolio-page";

export default function PortfolioPage() {
  return (
    <main className="of-dashboard-page">
      <header className="mb-10 space-y-2">
        <p className="text-zinc-500">{PORTFOLIO_SUPERVISION_PAGE_EYEBROW}</p>
        <h1 className="of-page-title">{PORTFOLIO_SUPERVISION_PAGE_TITLE}</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          {PORTFOLIO_SUPERVISION_PAGE_SUBTITLE}
        </p>
      </header>

      <PortfolioQualitySummaryPanel />
      <section className="of-card of-card-p8 mb-10 space-y-3">
        <div className="space-y-1">
          <p className="text-zinc-500">תפוקה ומדידה</p>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            דוחות שנשלחו ללקוח
          </h2>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            מעקב אחר דוחות שבועיים, פרוטוקולי מסירה, דוחות שנת בדק ודוחות בדק
            בית - כולל בדיקת עמידה שבועית לכל פרויקט פעיל.
          </p>
        </div>
        <Link
          href="/portfolio/deliverables"
          className="inline-flex text-sm font-medium text-brand hover:underline"
        >
          פתיחת מסך מדידת תפוקה
        </Link>
      </section>
      <PortfolioTradeHeatmapPanel />
      <PortfolioRecurringRankingsPanel />
      <PortfolioPeriodicReportExport />
      <PortfolioProjectRanking />
    </main>
  );
}
