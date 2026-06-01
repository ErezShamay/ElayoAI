"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";

type ModuleStatus = {
  organization_id: string;
  is_enabled: boolean;
  storage_available?: boolean;
};

export function useFieldReportModule() {
  const [status, setStatus] = useState<ModuleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/field-reports/module-status");

      if (!response.ok) {
        throw new Error("טעינת סטטוס המודול נכשלה");
      }

      setStatus(await response.json());
    } catch (err: unknown) {
      setStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : "טעינת סטטוס המודול נכשלה"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  return {
    status,
    isEnabled: Boolean(status?.is_enabled),
    loading,
    error,
    reload: load,
  };
}
