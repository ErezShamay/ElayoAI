"use client";

import Link from "next/link";

import { useFieldReportModule } from "@/hooks/useFieldReportModule";

export default function ProjectFieldReportLink({
  projectId,
}: {
  projectId: string;
}) {
  const { isEnabled, loading } = useFieldReportModule();

  if (loading || !isEnabled) {
    return null;
  }

  return (
    <Link
      href={`/field-reports/new?project=${projectId}`}
      className="text-sm font-medium text-brand hover:underline"
    >
      הפקת דוח לפרויקט
    </Link>
  );
}
