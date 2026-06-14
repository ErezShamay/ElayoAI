"use client";

import Link from "next/link";

import DeliverableReportsPanel from "@/components/deliverable-reports/DeliverableReportsPanel";

export default function PortfolioDeliverablesPage() {
  return (
    <main className="of-dashboard-page">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-zinc-500">תיק פיקוח הנדסי</p>
          <h1 className="of-page-title">מדידת תפוקת דוחות</h1>
        </div>
        <Link
          href="/portfolio"
          className="text-sm text-brand hover:underline"
        >
          חזרה לתיק פיקוח
        </Link>
      </header>

      <DeliverableReportsPanel />
    </main>
  );
}
