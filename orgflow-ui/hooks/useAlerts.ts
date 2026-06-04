"use client";

import { useCallback } from "react";

import { useOrgQuery } from "@/hooks/useOrgQuery";
import { getApiBaseUrl } from "@/lib/env/public-env";

type Alert = {
  severity: string;
  project_id: string;
  project_name: string;
  title: string;
  message: string;
};

type AlertsResponse = {
  alerts: Alert[];
  total_alerts: number;
};

export function useAlerts() {
  const loadAlerts = useCallback(async () => {
    const response = await fetch(`${getApiBaseUrl()}/alerts`);

    if (!response.ok) {
      throw new Error("Failed loading alerts");
    }

    const data: AlertsResponse = await response.json();
    return data.alerts;
  }, []);

  const {
    data,
    loading,
    isValidating,
  } = useOrgQuery("alerts", loadAlerts);

  return {
    alerts: data ?? [],
    loading,
    isValidating,
  };
}
