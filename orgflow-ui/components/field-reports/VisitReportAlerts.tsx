"use client";

type VisitReportAlertsProps = {
  pdfNotice: string;
  pdfError: string;
  reopenError: string;
};

export default function VisitReportAlerts({
  pdfNotice,
  pdfError,
  reopenError,
}: VisitReportAlertsProps) {
  return (
    <>
      {pdfNotice ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{pdfNotice}</p>
      ) : null}
      {pdfError ? <p className="text-sm text-red-600">{pdfError}</p> : null}
      {reopenError ? <p className="text-sm text-red-600">{reopenError}</p> : null}
    </>
  );
}
