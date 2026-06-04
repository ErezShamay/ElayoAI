import { capacitorStaticExportParams } from "@/lib/capacitor/build-mode";

export function generateStaticParams() {
  return capacitorStaticExportParams();
}

export default function FieldReportIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
