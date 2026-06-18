"use client";

import GenerateVisitReportPdfButton from "@/components/field-reports/GenerateVisitReportPdfButton";
import Button from "@/components/ui/Button";
import {
  isVisitReportFinalizeComplete,
  isVisitReportFinalizeFailed,
  isVisitReportFinalizing,
} from "@/lib/field-reports/finalize-status-labels";
import type { VisitReportPdfDownloadSource } from "@/lib/field-reports/pdf/generate-visit-report-pdf";
import type { PdfVisitReport } from "@/lib/field-reports/pdf/types";
import { downloadFieldVisitReportPdf } from "@/lib/deliverable-reports/api";

type VisitReportPdfActionsProps = {
  report: PdfVisitReport & {
    is_editable: boolean;
    status: string;
    is_published?: boolean;
    server_report_id?: string | null;
    client_report_uuid?: string;
  };
  isReopenedForEdit: boolean;
  hasLocalPdf: boolean;
  canFinalize?: boolean;
  isOnline?: boolean;
  onCacheChange: (hasLocal: boolean) => void;
  onSetNotice: (message: string) => void;
  onSetError: (message: string) => void;
  onFinalizeStart?: () => void;
  onFinalizeComplete?: () => void;
};

export default function VisitReportPdfActions({
  report,
  isReopenedForEdit,
  hasLocalPdf,
  canFinalize = false,
  isOnline = true,
  onCacheChange,
  onSetNotice,
  onSetError,
  onFinalizeStart,
  onFinalizeComplete,
}: VisitReportPdfActionsProps) {
  const serverReportId = report.server_report_id?.trim() || null;
  const isFinalizing = isVisitReportFinalizing(report.status);
  const isFinalized = isVisitReportFinalizeComplete(report.status);
  const isFinalizeFailed = isVisitReportFinalizeFailed(report.status);
  const canDownloadArchivedPdf = Boolean(
    (report.is_published || isFinalized) && serverReportId
  );

  if (report.is_editable && isReopenedForEdit) {
    return (
      <div className="space-y-1.5">
        <GenerateVisitReportPdfButton
          report={report}
          variant="secondary"
          className="min-h-12"
          forceRegenerate
          serverReportId={serverReportId}
          reportStatus={report.status}
          canFinalize={canFinalize}
          isOnline={isOnline}
          clientReportUuid={report.client_report_uuid}
          onCacheChange={onCacheChange}
          onFinalizeStart={onFinalizeStart}
          onFinalizeComplete={() => {
            onFinalizeComplete?.();
            onSetNotice(
              "ה-PDF עודכן והדוח נשלח לעיבוד. המייל יישלח אוטומטית בסיום."
            );
            onSetError("");
          }}
          onFinalizeError={(message) => {
            onSetError(message);
            onSetNotice("");
          }}
          onComplete={() => {
            onCacheChange(true);
            if (!canFinalize || !isOnline || !serverReportId) {
              onSetNotice(
                "ה-PDF עודכן לפי השינויים האחרונים, נשמר במכשיר והורד."
              );
            }
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

  const canShowPdfActions =
    !report.is_editable
    && (report.status === "CLOSED"
      || report.status === "PENDING_UPLOAD"
      || report.status === "LOCKED"
      || report.status === "FINALIZING"
      || report.status === "FINALIZED"
      || report.status === "FINALIZE_FAILED");

  if (!canShowPdfActions) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1">
      {isFinalizing ? (
        <p className="text-sm text-sky-800 dark:text-sky-300">
          מעלה ומעבד דוח... המייל יישלח אוטומטית בסיום.
        </p>
      ) : null}
      {isFinalized ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          הדוח נשלח בהצלחה לדיירים ולמשויכים לפרויקט.
        </p>
      ) : null}
      {isFinalizeFailed ? (
        <p className="text-sm text-red-600">
          עיבוד הדוח נכשל. נסה להפיק PDF מחדש.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        {canDownloadArchivedPdf ? (
          <Button
            type="button"
            className="min-h-12"
            onClick={() => {
              void downloadFieldVisitReportPdf(
                serverReportId!,
                report.project_name
                  ? `דוח-מפקח-${report.project_name}-${report.visit_date}.pdf`
                  : undefined
              )
                .then(() => {
                  onSetNotice("ה-PDF הורד מהארכיון בשרת.");
                  onSetError("");
                })
                .catch((err: unknown) => {
                  onSetError(
                    err instanceof Error
                      ? err.message
                      : "הורדת ה-PDF מהארכיון נכשלה"
                  );
                  onSetNotice("");
                });
            }}
          >
            הורד PDF מהארכיון
          </Button>
        ) : null}
        {!isFinalizing && !isFinalized ? (
          <GenerateVisitReportPdfButton
            report={report}
            className="min-h-12"
            serverReportId={serverReportId}
            reportStatus={report.status}
            canFinalize={canFinalize}
            isOnline={isOnline}
            clientReportUuid={report.client_report_uuid}
            onCacheChange={onCacheChange}
            onFinalizeStart={onFinalizeStart}
            onFinalizeComplete={() => {
              onFinalizeComplete?.();
              onSetNotice(
                "הדוח נשלח בהצלחה לדיירים ולמשויכים לפרויקט."
              );
              onSetError("");
            }}
            onFinalizeError={(message) => {
              onSetError(message);
              onSetNotice("");
            }}
            onComplete={(source: VisitReportPdfDownloadSource) => {
              onCacheChange(true);
              if (source === "cache") {
                onSetNotice(
                  "ה-PDF הורד מהעותק השמור במכשיר (ללא רשת)."
                );
              } else if (!canFinalize || !isOnline || !serverReportId) {
                onSetNotice("ה-PDF הופק, נשמר במכשיר והורד.");
              }
              onSetError("");
            }}
            onError={(message) => {
              onSetError(message);
              onSetNotice("");
            }}
          />
        ) : null}
        {hasLocalPdf ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            PDF שמור במכשיר
          </span>
        ) : null}
        {!isFinalized ? (
          <span className="text-sm text-zinc-600">
            {hasLocalPdf
              ? "ניתן להוריד שוב את ה-PDF גם ללא רשת."
              : "לפני הפקה ראשונה תוצג תצוגה מקדימה לאישור; לאחר אישור הדוח יעובד ויישלח במייל אוטומטית."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
