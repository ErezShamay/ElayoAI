"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";

import VisitReportEditor from "@/components/field-reports/VisitReportEditor";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";

type VisitReport = {
  id: string;
  project_name?: string;
  visit_type: string;
  visit_type_label_he: string;
  status_label_he: string;
  visit_date: string;
  status: string;
  header_fields: Record<string, unknown>;
  catalog_version?: string | null;
  lines: Array<Record<string, unknown>>;
  line_count?: number;
  is_editable: boolean;
};

export default function FieldVisitReportPage() {
  const params = useParams();
  const reportId = typeof params.id === "string" ? params.id : "";
  const [report, setReport] = useState<VisitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!reportId) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${reportId}`
      );

      if (!response.ok) {
        throw new Error("טעינת הדוח נכשלה");
      }

      setReport(await response.json());
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "טעינת הדוח נכשלה"
      );
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    startTransition(() => {
      void loadReport();
    });
  }, [loadReport]);

  if (loading) {
    return (
      <div className="of-container mx-auto max-w-3xl p-8 text-sm text-zinc-500">
        טוען דוח...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="of-container mx-auto max-w-3xl space-y-4 p-8">
        <p className="text-sm text-red-600">{error || "דוח לא נמצא"}</p>
        <Button variant="secondary" onClick={() => void loadReport()}>
          נסה שוב
        </Button>
        <Link href="/field-reports" className="block text-sm text-brand hover:underline">
          חזרה לרשימה
        </Link>
      </div>
    );
  }

  return (
    <div className="of-container mx-auto max-w-3xl space-y-6 p-8">
      <header className="space-y-3">
        <Link
          href="/field-reports"
          className="text-sm text-brand hover:underline"
        >
          ← הדוחות שלי
        </Link>
        <h1 className="of-page-title text-2xl">
          {report.project_name || "דוח ביקור"}
        </h1>
        <p className="text-sm text-zinc-600">
          {report.visit_type_label_he} · תאריך ביקור: {report.visit_date}
        </p>
      </header>

      <VisitReportEditor
        report={report}
        onReportChange={setReport}
      />
    </div>
  );
}
