"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
import {
  clearCachedFieldReportModuleStatus,
  readCachedFieldReportModuleStatus,
  writeCachedFieldReportModuleStatus,
} from "@/lib/field-reports/module-status-cache";
import {
  clearFieldReportLocalState,
} from "@/lib/field-reports/module-local-state";

type ModuleStatus = {
  organization_id: string;
  is_enabled: boolean;
  storage_available?: boolean;
};

function moduleStatusFromCache(
  organizationId: string
): ModuleStatus | null {
  const cached = readCachedFieldReportModuleStatus(organizationId);
  if (!cached) {
    return null;
  }

  return {
    organization_id: cached.organization_id,
    is_enabled: cached.is_enabled,
    storage_available: cached.storage_available,
  };
}

export function useFieldReportModule() {
  const { currentOrgId, profile } = useAuth();
  const organizationIdHint =
    currentOrgId ?? profile?.organization_id ?? "";
  const [status, setStatus] = useState<ModuleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingCachedStatus, setUsingCachedStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setUsingCachedStatus(false);

      const response = await apiFetch("/field-reports/module-status");

      if (!response.ok) {
        throw new Error("טעינת סטטוס המודול נכשלה");
      }

      const nextStatus = (await response.json()) as ModuleStatus;
      setStatus(nextStatus);
      writeCachedFieldReportModuleStatus(nextStatus);

      if (!nextStatus.is_enabled) {
        clearCachedFieldReportModuleStatus(nextStatus.organization_id);
      }
    } catch (err: unknown) {
      const cachedStatus = organizationIdHint
        ? moduleStatusFromCache(organizationIdHint)
        : null;

      if (cachedStatus?.is_enabled) {
        setStatus(cachedStatus);
        setUsingCachedStatus(true);
        setError("");
      } else {
        setStatus(null);
        setError(
          err instanceof Error
            ? err.message
            : "טעינת סטטוס המודול נכשלה"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [organizationIdHint]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!status?.organization_id || status.is_enabled) {
      return;
    }

    // Keep re-enable flow clean (5.4): don't restore local drafts/state
    // after module was disabled by the supplier.
    clearFieldReportLocalState(status.organization_id);
    clearCachedFieldReportModuleStatus(status.organization_id);
  }, [status]);

  return {
    status,
    isEnabled: Boolean(status?.is_enabled),
    loading,
    error,
    usingCachedStatus,
    reload: load,
  };
}
