"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFieldReportModule } from "@/hooks/useFieldReportModule";
import { useFieldReportNetworkStatus } from "@/hooks/useFieldReportNetworkStatus";
import { loadPendingSendRequests } from "@/lib/field-reports/send-queue";
import {
  enrichSyncPanelQueueEntries,
  type SyncPanelQueueEntry,
} from "@/lib/field-reports/sync-panel-queue";
import {
  buildSyncRunSummary,
  type SyncRunSummary,
} from "@/lib/field-reports/sync-panel-view";
import {
  SyncManager,
  type SyncManagerProgressEvent,
} from "@/lib/field-reports/sync/sync-manager";
import {
  clearFieldReportSyncErrorsForOrganization,
  recordFieldReportSyncError,
} from "@/lib/field-reports/sync/sync-error-monitor";

export type FieldReportSyncProgress = Pick<
  SyncManagerProgressEvent,
  "index" | "total" | "phase"
>;

export function useFieldReportSyncPanel() {
  const { canSync, checking, connectivity } = useFieldReportNetworkStatus();
  const { status: moduleStatus, isEnabled } = useFieldReportModule();
  const organizationId = moduleStatus?.organization_id || "";
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState("");
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const [queueEntries, setQueueEntries] = useState<SyncPanelQueueEntry[]>([]);
  const [progress, setProgress] = useState<FieldReportSyncProgress | null>(
    null
  );
  const [lastRunSummary, setLastRunSummary] = useState<SyncRunSummary | null>(
    null
  );
  const runningRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    if (!organizationId) {
      setPendingSendCount(0);
      setQueueEntries([]);
      return;
    }

    const pending = await loadPendingSendRequests(organizationId);
    setPendingSendCount(pending.length);
    setQueueEntries(await enrichSyncPanelQueueEntries(pending));
  }, [organizationId]);

  const runSync = useCallback(async () => {
    if (!organizationId || !canSync || runningRef.current) {
      return;
    }

    runningRef.current = true;
    setSyncing(true);
    setLastSyncError("");
    setLastRunSummary(null);

    const pendingBefore = await loadPendingSendRequests(organizationId);
    const total = pendingBefore.length;
    if (total > 0) {
      setProgress({ index: 1, total, phase: pendingBefore[0]?.syncPhase ?? "queued" });
    }

    try {
      const sendResult = await SyncManager.runForOrganization(
        organizationId,
        undefined,
        {
          onProgress: (event) => {
            setProgress({
              index: event.index,
              total: event.total,
              phase: event.phase,
            });
          },
        }
      );

      const summary = buildSyncRunSummary(sendResult.processed);
      setLastRunSummary(summary);

      const failed = sendResult.processed.filter((item) => !item.success);
      if (failed.length) {
        const message = failed
          .map((item) => item.error)
          .filter(Boolean)
          .join(" · ");
        setLastSyncError(
          message || "סנכרון דוחות ממתינים לשליחה נכשל"
        );
      } else {
        clearFieldReportSyncErrorsForOrganization(organizationId);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "סנכרון נכשל";
      setLastSyncError(message);
      recordFieldReportSyncError({
        organizationId,
        clientReportUuid: "sync-run",
        phase: "queued",
        message,
      });
    } finally {
      runningRef.current = false;
      setSyncing(false);
      setProgress(null);
      await refreshQueue();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("field-report-sync-complete", {
            detail: { organizationId },
          })
        );
      }
    }
  }, [canSync, organizationId, refreshQueue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshQueue();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshQueue]);

  useEffect(() => {
    if (!isEnabled || !organizationId || !canSync) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runSync();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isEnabled, canSync, organizationId, runSync]);

  return {
    organizationId,
    canSync,
    checking,
    connectivity,
    syncing,
    lastSyncError,
    pendingSendCount,
    queueEntries,
    progress,
    lastRunSummary,
    refreshQueue,
    refreshPendingCount: refreshQueue,
    runSync,
  };
}

export type UseFieldReportSyncPanelResult = ReturnType<
  typeof useFieldReportSyncPanel
>;
