import { capacitorStaticExportParams } from "@/lib/capacitor/build-mode";

export function generateStaticParams() {
  return capacitorStaticExportParams();
}

export default function ActionIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
