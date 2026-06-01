"use client";

import { useCallback, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import {
  isOfflinePrepValid,
  loadOfflinePrepBundle,
  saveOfflinePrepBundle,
  type OfflinePrepBundle,
} from "@/lib/field-reports/offline-store";
import { useFieldReportModule } from "@/hooks/useFieldReportModule";

export function useFieldReportOfflinePrep() {
  const { status } = useFieldReportModule();
  const organizationId = status?.organization_id || "";
  const storedBundle = useMemo(
    () =>
      organizationId
        ? loadOfflinePrepBundle(organizationId)
        : null,
    [organizationId]
  );
  const [preparedBundle, setPreparedBundle] = useState<{
    organizationId: string;
    bundle: OfflinePrepBundle;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bundle =
    preparedBundle?.organizationId === organizationId
      ? preparedBundle.bundle
      : storedBundle;

  const prepare = useCallback(async () => {
    if (!organizationId) {
      return null;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/field-reports/offline-prep");

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || "הכנה לא מקוון נכשלה"
        );
      }

      const payload = await response.json();
      const saved = saveOfflinePrepBundle(organizationId, payload);
      setPreparedBundle({
        organizationId,
        bundle: saved,
      });
      return saved;
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "הכנה לא מקוון נכשלה"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  return {
    bundle,
    isReady: isOfflinePrepValid(bundle),
    expiresAt: bundle?.expires_at || null,
    catalogVersion: bundle?.catalog_version || null,
    loading,
    error,
    prepare,
  };
}
