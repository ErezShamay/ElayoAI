"use client";

import type { ReactNode } from "react";

import { useFieldReportSyncQueue } from "@/hooks/useFieldReportSyncQueue";

export default function FieldReportSyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { syncing, lastSyncError, pendingSendCount } =
    useFieldReportSyncQueue();

  return (
    <>
      {pendingSendCount > 0 || syncing || lastSyncError ? (
        <div
          className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
          role="status"
          aria-live="polite"
        >
          {syncing ? (
            <p>מסנכרן דוחות ותמונות שהמתינו במכשיר...</p>
          ) : pendingSendCount > 0 ? (
            <p>
              {pendingSendCount} דוחות ממתינים לשליחה — יסונכרנו אוטומטית
              כשהרשת זמינה.
            </p>
          ) : null}
          {lastSyncError ? (
            <p className="mt-1 text-amber-900 dark:text-amber-200">
              {lastSyncError}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );
}
