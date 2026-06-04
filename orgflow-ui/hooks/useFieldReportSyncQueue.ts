"use client";

import { useFieldReportSyncContext } from "@/contexts/FieldReportSyncContext";

/** @deprecated Use `useFieldReportSyncContext` within `FieldReportSyncProvider`. */
export function useFieldReportSyncQueue() {
  const panel = useFieldReportSyncContext();

  return {
    syncing: panel.syncing,
    lastSyncError: panel.lastSyncError,
    pendingSendCount: panel.pendingSendCount,
    refreshPendingCount: panel.refreshPendingCount,
    runSync: panel.runSync,
  };
}
