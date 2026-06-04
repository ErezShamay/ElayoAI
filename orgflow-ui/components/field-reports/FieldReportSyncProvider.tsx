"use client";

import type { ReactNode } from "react";

import SyncPanel from "@/components/field-reports/SyncPanel";
import { FieldReportSyncContextProvider } from "@/contexts/FieldReportSyncContext";

export default function FieldReportSyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <FieldReportSyncContextProvider>
      <SyncPanel />
      {children}
    </FieldReportSyncContextProvider>
  );
}
