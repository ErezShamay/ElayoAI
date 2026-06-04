import { capacitorStaticExportParams } from "@/lib/capacitor/build-mode";

export function generateStaticParams() {
  return capacitorStaticExportParams();
}

export default function ProjectIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
