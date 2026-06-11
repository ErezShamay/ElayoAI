"use client";

import OperationalReviewPanel from "@/components/quality-issues/OperationalReviewPanel";
import {
  OPERATIONAL_REVIEW_PAGE_EYEBROW,
  OPERATIONAL_REVIEW_PAGE_SUBTITLE,
  OPERATIONAL_REVIEW_PAGE_TITLE,
} from "@/lib/quality-issues/operational-review-page";

export default function OperationalReviewPage() {
  return (
    <main className="of-dashboard-page">
      <header className="mb-10 space-y-2">
        <p className="text-zinc-500">{OPERATIONAL_REVIEW_PAGE_EYEBROW}</p>
        <h1 className="of-page-title">{OPERATIONAL_REVIEW_PAGE_TITLE}</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          {OPERATIONAL_REVIEW_PAGE_SUBTITLE}
        </p>
      </header>

      <OperationalReviewPanel />
    </main>
  );
}
