"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  useFieldReportSyncPanel,
  type UseFieldReportSyncPanelResult,
} from "@/hooks/useFieldReportSyncPanel";

const FieldReportSyncContext =
  createContext<UseFieldReportSyncPanelResult | null>(null);

export function FieldReportSyncContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useFieldReportSyncPanel();

  return (
    <FieldReportSyncContext.Provider value={value}>
      {children}
    </FieldReportSyncContext.Provider>
  );
}

export function useFieldReportSyncContext(): UseFieldReportSyncPanelResult {
  const context = useContext(FieldReportSyncContext);

  if (!context) {
    throw new Error(
      "useFieldReportSyncContext must be used within FieldReportSyncContextProvider"
    );
  }

  return context;
}
