"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";

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

  const [
    alerts,
    setAlerts
  ] = useState<Alert[]>([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      const response =
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alerts`
        );

      if (!response.ok) {
        throw new Error(
          "Failed loading alerts"
        );
      }

      const data:
        AlertsResponse =
          await response.json();

      setAlerts(
        data.alerts
      );

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadAlerts();
    });

    const interval =
      setInterval(() => {
        void loadAlerts();
      }, 30000);

    return () => {
      clearInterval(interval);
    };

  }, [loadAlerts]);

  return {
    alerts,
    loading,
  };
}
