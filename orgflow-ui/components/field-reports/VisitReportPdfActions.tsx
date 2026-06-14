"use client";

import GenerateVisitReportPdfButton, {
} from "@/components/field-reports/GenerateVisitReportPdfButton";
import Button from "@/components/ui/Button";
import type { VisitReportPdfDownloadSource } from "@/lib/field-reports/pdf/generate-visit-report-pdf";
import type { PdfVisitReport } from "@/lib/field-reports/pdf/types";
import { downloadFieldVisitReportPdf } from "@/lib/deliverable-reports/api";

type VisitReportPdfActionsProps = {
  report: PdfVisitReport & {
    is_editable: boolean;
    status: string;
    is_published?: boolean;
    server_report_id?: string | null;
  };
  isReopenedForEdit: boolean;
  showPendingSendState: boolean;
  hasLocalPdf: boolean;
  onCacheChange: (hasLocal: boolean) => void;
  onSetNotice: (message: string) => void;
  onSetError: (message: string) => void;
};

export default function VisitReportPdfActions({
  report,
  isReopenedForEdit,
  showPendingSendState,
  hasLocalPdf,
  onCacheChange,
  onSetNotice,
  onSetError,
}: VisitReportPdfActionsProps) {
  const serverReportId = report.server_report_id?.trim() || null;
  const canDownloadArchivedPdf = Boolean(report.is_published && serverReportId);
  if (report.is_editable && isReopenedForEdit) {
    return (
      <div className="space-y-1.5">
        <GenerateVisitReportPdfButton
          report={report}
          variant="secondary"
          className="min-h-12"
          forceRegenerate
          onCacheChange={onCacheChange}
          onComplete={() => {
            onCacheChange(true);
            onSetNotice("ה-PDF עודכן לפי השינויים האחרונים, נשמר במכשיר והורד.");
            onSetError("");
          }}
          onError={(message) => {
            onSetError(message);
            onSetNotice("");
          }}
        />
        <span className="text-sm text-zinc-600">
          לפני עדכון תוצג תצוגה מקדימה לאישור - נשמרת גרסה אחרונה בלבד במכשיר.
        </span>
      </div>
    );
  }

  const canDownloadPdf =
    !report.is_editable
    && (report.status === "CLOSED"
      || report.status === "PENDING_UPLOAD"
      || report.status === "LOCKED"
      || showPendingSendState);

  if (!canDownloadPdf) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      {canDownloadArchivedPdf ? (
        <Button
          type="button"
          className="min-h-12"
          onClick={() => {
            void downloadFieldVisitReportPdf(serverReportId!, report.project_name
              ? `דוח-מפקח-${report.project_name}-${report.visit_date}.pdf`
              : undefined)
              .then(() => {
                onSetNotice("ה-PDF הורד מהארכיון בשרת.");
                onSetError("");
              })
              .catch((err: unknown) => {
                onSetError(
                  err instanceof Error ? err.message : "הורדת ה-PDF מהארכיון נכשלה"
                );
                onSetNotice("");
              });
          }}
        >
          הורד PDF מהארכיון
        </Button>
      ) : null}
      <GenerateVisitReportPdfButton
        report={report}
        className="min-h-12"
        onCacheChange={onCacheChange}
        onComplete={(source: VisitReportPdfDownloadSource) => {
          onCacheChange(true);
          onSetNotice(
            source === "cache"
              ? "ה-PDF הורד מהעותק השמור במכשיר (ללא רשת)."
              : "ה-PDF הופק, נשמר במכשיר והורד."
          );
          onSetError("");
        }}
        onError={(message) => {
          onSetError(message);
          onSetNotice("");
        }}
      />
      {hasLocalPdf ? (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          PDF שמור במכשיר
        </span>
      ) : null}
      <span className="text-sm text-zinc-600">
        {hasLocalPdf
          ? "ניתן להוריד שוב את ה-PDF גם ללא רשת."
          : "לפני הפקה ראשונה תוצג תצוגה מקדימה לאישור; לאחר שמירה ההורדה זמינה גם בלי רשת."}
      </span>
    </div>
  );
}
