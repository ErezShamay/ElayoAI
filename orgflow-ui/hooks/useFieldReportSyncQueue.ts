"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFieldReportModule } from "@/hooks/useFieldReportModule";
import { flushAllReportMetadataDrafts } from "@/lib/field-reports/report-metadata-draft";
import { processSendQueue } from "@/lib/field-reports/process-send-queue";
import { loadPendingSendRequests } from "@/lib/field-reports/send-queue";
import { syncAllPendingLinePhotos } from "@/lib/field-reports/sync-pending-line-photos";
import { useOffline } from "@/providers/OfflineProvider";

export function useFieldReportSyncQueue() {
  const { isOnline } = useOffline();
  const { status: moduleStatus, isEnabled } = useFieldReportModule();
  const organizationId = moduleStatus?.organization_id || "";
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState("");
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const runningRef = useRef(false);

  const refreshPendingCount = useCallback(() => {
    if (!organizationId) {
      setPendingSendCount(0);
      return;
    }

    setPendingSendCount(
      loadPendingSendRequests(organizationId).length
    );
  }, [organizationId]);

  const runSync = useCallback(async () => {
    if (!organizationId || !isOnline || runningRef.current) {
      return;
    }

    runningRef.current = true;
    setSyncing(true);
    setLastSyncError("");

    try {
      await flushAllReportMetadataDrafts(organizationId);

      const photoResult = await syncAllPendingLinePhotos();
      if (photoResult.failed.length) {
        setLastSyncError(
          `העלאת ${photoResult.failed.length} תמונות נכשלה — ינסה שוב בהתחברות`
        );
      }

      const sendResult = await processSendQueue(organizationId);
      const failed = sendResult.processed.filter((item) => !item.success);

      if (failed.length) {
        const message = failed
          .map((item) => item.error)
          .filter(Boolean)
          .join(" · ");
        setLastSyncError(
          message || "סנכרון דוחות ממתינים לשליחה נכשל"
        );
      }
    } catch (err: unknown) {
      setLastSyncError(
        err instanceof Error ? err.message : "סנכרון נכשל"
      );
    } finally {
      runningRef.current = false;
      setSyncing(false);
      refreshPendingCount();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("field-report-sync-complete", {
            detail: { organizationId },
          })
        );
      }
    }
  }, [isOnline, organizationId, refreshPendingCount]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshPendingCount();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!isEnabled || !organizationId || !isOnline) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runSync();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isEnabled, isOnline, organizationId, runSync]);

  return {
    syncing,
    lastSyncError,
    pendingSendCount,
    refreshPendingCount,
    runSync,
  };
}
