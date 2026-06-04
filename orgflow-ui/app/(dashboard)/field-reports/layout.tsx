import FieldReportSyncProvider from "@/components/field-reports/FieldReportSyncProvider";
import FieldReportsOfflineBanner from "@/components/field-reports/FieldReportsOfflineBanner";

export default function FieldReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fr-field-reports min-h-full bg-zinc-50/50 dark:bg-zinc-950/40">
      <FieldReportsOfflineBanner />
      <FieldReportSyncProvider>{children}</FieldReportSyncProvider>
    </div>
  );
}
