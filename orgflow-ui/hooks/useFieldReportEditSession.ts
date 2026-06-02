"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  claimEditSession,
  isEditingReport,
  readEditSession,
  releaseEditSession,
  type FieldReportEditSession,
} from "@/lib/field-reports/edit-session";

export function useFieldReportEditSession(
  organizationId: string,
  reportId: string
) {
  const [session, setSession] = useState<FieldReportEditSession | null>(null);

  const refreshSession = useCallback(() => {
    if (!organizationId) {
      setSession(null);
      return;
    }
    setSession(readEditSession(organizationId));
  }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshSession();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshSession, reportId]);

  const isActiveEditor = useMemo(
    () => isEditingReport(organizationId, reportId),
    [organizationId, reportId]
  );

  const blockingSession = useMemo(() => {
    if (!session || session.reportId === reportId) {
      return null;
    }
    return session;
  }, [reportId, session]);

  const claim = useCallback(() => {
    if (!organizationId || !reportId) {
      return;
    }

    claimEditSession(organizationId, reportId);
    refreshSession();
  }, [organizationId, reportId, refreshSession]);

  const release = useCallback(() => {
    if (!organizationId || !reportId) {
      return;
    }

    releaseEditSession(organizationId, reportId);
    refreshSession();
  }, [organizationId, reportId, refreshSession]);

  useEffect(() => {
    if (!organizationId || !reportId) {
      return;
    }

    if (!blockingSession) {
      const timer = window.setTimeout(() => {
        claim();
      }, 0);
      return () => {
        window.clearTimeout(timer);
        if (isEditingReport(organizationId, reportId)) {
          releaseEditSession(organizationId, reportId);
        }
      };
    }

    return () => {
      if (isEditingReport(organizationId, reportId)) {
        releaseEditSession(organizationId, reportId);
      }
    };
  }, [organizationId, reportId, blockingSession, claim]);

  return {
    blockingSession,
    isActiveEditor,
    claim,
    release,
  };
}
