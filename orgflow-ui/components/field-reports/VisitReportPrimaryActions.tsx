"use client";

import Button from "@/components/ui/Button";

type VisitReportPrimaryActionsReport = {
  is_editable: boolean;
  can_reopen?: boolean;
};

type VisitReportPrimaryActionsProps = {
  report: VisitReportPrimaryActionsReport;
  isOnline: boolean;
  /** סגירה מקומית בלי POST לשרת (FR-016). */
  canCloseOffline?: boolean;
  isReopenedForEdit: boolean;
  reopenLoading: boolean;
  compact?: boolean;
  onOpenFinishDialog: () => void;
  onConfirmReopenReport: () => void;
};

export default function VisitReportPrimaryActions({
  report,
  isOnline,
  canCloseOffline = false,
  isReopenedForEdit,
  reopenLoading,
  compact = false,
  onOpenFinishDialog,
  onConfirmReopenReport,
}: VisitReportPrimaryActionsProps) {
  if (report.is_editable) {
    return (
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          size="lg"
          className="min-h-12"
          onClick={onOpenFinishDialog}
          disabled={!isOnline && !canCloseOffline}
        >
          {isReopenedForEdit ? "סגור דוח שוב" : "סיום דוח"}
        </Button>
        {!isOnline && !canCloseOffline ? (
          <span className="self-center text-sm text-amber-800">סגירה דורשת רשת</span>
        ) : null}
      </div>
    );
  }

  if (!report.can_reopen) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <Button
        size="lg"
        className="min-h-12"
        onClick={onConfirmReopenReport}
        disabled={!isOnline || reopenLoading}
      >
        {reopenLoading ? "פותח לעריכה..." : "ערוך שוב"}
      </Button>
      {!isOnline && !compact ? (
        <span className="self-center text-sm text-amber-800">
          עריכה מחדש דורשת רשת
        </span>
      ) : null}
    </div>
  );
}
